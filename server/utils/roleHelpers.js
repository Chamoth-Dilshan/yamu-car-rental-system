const { computeProfileCompletion } = require('./profileHelpers');

const ROLE_KEYS = ['customer', 'driver', 'staff', 'admin'];
const PROVIDER_ROLE_KEYS = ['driver', 'staff'];
const ACCOUNT_STATUSES = ['active', 'suspended', 'deactivated'];
const ROLE_STATUSES = ['pending', 'active', 'rejected', 'suspended', 'deactivated'];
const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];
const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];
const PERMISSIONS = ['users.view', 'users.edit', 'roles.review', 'roles.assign', 'bookings.manage'];

const ROLE_PERMISSION_MAP = {
  customer: [],
  driver: [],
  staff: [],
  admin: [...PERMISSIONS]
};

const buildRoleAssignment = (
  roleKey,
  {
    roleStatus = roleKey === 'customer' || roleKey === 'admin' ? 'active' : 'pending',
    verificationStatus = roleKey === 'customer' || roleKey === 'admin' ? 'verified' : 'pending',
    isPrimary = false
  } = {}
) => ({
  roleKey,
  roleStatus,
  verificationStatus,
  isPrimary
});

const getRoleAssignment = (user, roleKey) => user?.roles?.find((item) => item.roleKey === roleKey);

const getPrimaryRole = (user) => user?.roles?.find((item) => item.isPrimary)?.roleKey || user?.roles?.[0]?.roleKey || null;

const isBlockedRole = (assignment) => !assignment || ['rejected', 'suspended', 'deactivated'].includes(assignment.roleStatus);

const canUseRole = (assignment) => (
  !!assignment
  && assignment.roleStatus === 'active'
  && assignment.verificationStatus === 'verified'
);

const canManageRoleProfile = (assignment) => (
  !!assignment
  && ['pending', 'active'].includes(assignment.roleStatus)
  && ['pending', 'verified'].includes(assignment.verificationStatus)
);

const getUsableRoleAssignments = (user) => (user?.roles || []).filter((role) => canUseRole(role));

const getPermissionsForRole = (roleKey) => [...(ROLE_PERMISSION_MAP[roleKey] || [])];

const getPermissionsForUser = (user, roleKey = user?.role) => {
  const assignment = getRoleAssignment(user, roleKey);

  if (!canUseRole(assignment)) {
    return [];
  }

  return getPermissionsForRole(roleKey);
};

const hasPermission = (user, permission) => getPermissionsForUser(user).includes(permission);

const normalizeRoleAssignment = (role = {}) => {
  if (!ROLE_KEYS.includes(role.roleKey)) {
    return null;
  }

  if (role.roleKey === 'customer' || role.roleKey === 'admin') {
    return buildRoleAssignment(role.roleKey, {
      roleStatus: 'active',
      verificationStatus: 'verified',
      isPrimary: Boolean(role.isPrimary)
    });
  }

  const normalizedLegacyStatus = role.roleStatus === 'verified' ? 'active' : role.roleStatus;
  let roleStatus = ROLE_STATUSES.includes(normalizedLegacyStatus) ? normalizedLegacyStatus : 'pending';
  let verificationStatus = VERIFICATION_STATUSES.includes(role.verificationStatus)
    ? role.verificationStatus
    : 'pending';

  if (roleStatus === 'rejected') {
    verificationStatus = 'rejected';
  }

  if (roleStatus === 'pending' && verificationStatus === 'verified') {
    verificationStatus = 'pending';
  }

  if (roleStatus === 'active' && verificationStatus === 'rejected') {
    verificationStatus = 'pending';
  }

  return {
    roleKey: role.roleKey,
    roleStatus,
    verificationStatus,
    isPrimary: Boolean(role.isPrimary)
  };
};

const ensureSinglePrimaryRole = (roles = []) => {
  const nextRoles = roles.map((role) => ({ ...role }));

  if (!nextRoles.length) {
    return nextRoles;
  }

  let hasPrimary = false;
  nextRoles.forEach((role, index) => {
    if (role.isPrimary && !hasPrimary) {
      hasPrimary = true;
      return;
    }

    role.isPrimary = false;

    if (!hasPrimary && index === 0) {
      role.isPrimary = true;
      hasPrimary = true;
    }
  });

  return nextRoles;
};

const syncUserRoles = (user) => {
  const uniqueRoles = [];

  (user.roles || []).forEach((role) => {
    const normalizedRole = normalizeRoleAssignment(role);

    if (!normalizedRole) {
      return;
    }

    if (uniqueRoles.some((item) => item.roleKey === normalizedRole.roleKey)) {
      return;
    }

    uniqueRoles.push(normalizedRole);
  });

  if (!uniqueRoles.length) {
    uniqueRoles.push(buildRoleAssignment('customer', { isPrimary: true }));
  }

  user.roles = ensureSinglePrimaryRole(uniqueRoles);

  const primaryRole = getPrimaryRole(user);
  const currentAssignment = getRoleAssignment(user, user.role);

  if (!currentAssignment) {
    user.role = primaryRole;
  }

  if (!canUseRole(getRoleAssignment(user, user.role))) {
    user.role = user.roles.find((item) => canUseRole(item))?.roleKey || primaryRole;
  }

  user.accountStatus = ACCOUNT_STATUSES.includes(user.accountStatus) ? user.accountStatus : 'active';
  user.verificationStatus = getRoleAssignment(user, user.role)?.verificationStatus || 'verified';

  return user;
};

const validateManagedUserState = ({ accountStatus, roles, activeRole, primaryRole }) => {
  const nextRoles = ensureSinglePrimaryRole((roles || []).map((role) => normalizeRoleAssignment(role)).filter(Boolean));
  const assignedRoleKeys = nextRoles.map((role) => role.roleKey);

  if (!assignedRoleKeys.includes('customer')) {
    return { valid: false, message: 'Customer access must remain assigned to the account' };
  }

  if (new Set(assignedRoleKeys).size !== assignedRoleKeys.length) {
    return { valid: false, message: 'Duplicate roles are not allowed' };
  }

  if (!assignedRoleKeys.includes(primaryRole)) {
    return { valid: false, message: 'Primary role must be one of the assigned roles' };
  }

  if (!assignedRoleKeys.includes(activeRole)) {
    return { valid: false, message: 'Active role must be one of the assigned roles' };
  }

  const invalidPendingRole = nextRoles.find((role) => role.roleStatus === 'pending' && role.verificationStatus === 'verified');
  if (invalidPendingRole) {
    return {
      valid: false,
      message: `${invalidPendingRole.roleKey} cannot be marked verified while the role is still pending`
    };
  }

  const invalidRejectedRole = nextRoles.find((role) => role.roleStatus === 'rejected' && role.verificationStatus !== 'rejected');
  if (invalidRejectedRole) {
    return {
      valid: false,
      message: `${invalidRejectedRole.roleKey} must keep a rejected verification state when the role is rejected`
    };
  }

  const invalidActiveRole = nextRoles.find((role) => role.roleStatus === 'active' && role.verificationStatus !== 'verified');
  if (invalidActiveRole) {
    return {
      valid: false,
      message: `${invalidActiveRole.roleKey} must be verified before the role can be active`
    };
  }

  if (accountStatus === 'active' && !canUseRole(nextRoles.find((role) => role.roleKey === activeRole))) {
    return { valid: false, message: 'Active role must be active and verified while the account is active' };
  }

  return { valid: true };
};

const sortProviderApplications = (applications = []) => (
  [...applications].sort((left, right) => {
    const leftDate = new Date(left?.submittedAt || left?.reviewedAt || 0).valueOf();
    const rightDate = new Date(right?.submittedAt || right?.reviewedAt || 0).valueOf();
    return rightDate - leftDate;
  })
);

const getProviderApplicationsForRole = (user, roleKey, statuses = null) => {
  const allowedStatuses = Array.isArray(statuses) ? statuses : null;
  return sortProviderApplications(
    (user?.providerApplications || []).filter((item) => (
      item.roleKey === roleKey
      && (!allowedStatuses || allowedStatuses.includes(item.status))
    ))
  );
};

const getLatestProviderApplication = (user, roleKey, statuses = null) => (
  getProviderApplicationsForRole(user, roleKey, statuses)[0] || null
);

const getLatestPendingProviderApplication = (user, roleKey) => (
  getLatestProviderApplication(user, roleKey, ['pending'])
);

const getLatestApprovedProviderApplication = (user, roleKey) => (
  getLatestProviderApplication(user, roleKey, ['approved'])
);

const createProviderApplication = (user, roleKey, applicationData) => {
  const nextData = {
    roleKey,
    status: 'pending',
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: '',
    applicationData
  };

  user.providerApplications.push(nextData);
  return user.providerApplications[user.providerApplications.length - 1];
};

const serializeUser = (userDoc) => {
  const rawUser = userDoc?.toObject ? userDoc.toObject() : { ...userDoc };
  const roles = ensureSinglePrimaryRole(
    (Array.isArray(rawUser.roles) ? rawUser.roles : []).map((role) => normalizeRoleAssignment(role)).filter(Boolean)
  );
  const preferredActiveRole = rawUser.role;
  const activeRole = roles.find((item) => item.roleKey === preferredActiveRole)
    ? preferredActiveRole
    : (roles.find((item) => canUseRole(item))?.roleKey || roles[0]?.roleKey || null);
  const primaryRole = roles.find((item) => item.isPrimary)?.roleKey || roles[0]?.roleKey || null;
  const activeRoleAssignment = roles.find((item) => item.roleKey === activeRole);
  const unreadNotificationCount = (rawUser.notifications || []).filter((item) => !item.isRead).length;

  return {
    _id: rawUser._id,
    username: rawUser.username,
    fullName: rawUser.fullName,
    email: rawUser.email,
    phone: rawUser.phone || '',
    address: rawUser.address || '',
    city: rawUser.city || '',
    dob: rawUser.dob || '',
    bio: rawUser.bio || '',
    preferredLanguage: rawUser.preferredLanguage || 'English',
    emergencyContact: rawUser.emergencyContact || { name: '', phone: '', relationship: '' },
    profileCompletion: computeProfileCompletion(rawUser),
    permissions: getPermissionsForUser(rawUser, activeRole),
    profilePic: rawUser.profilePic || 'avatar.png',
    role: activeRole,
    activeRole,
    primaryRole,
    roles,
    accountStatus: rawUser.accountStatus,
    verificationStatus: activeRoleAssignment?.verificationStatus || rawUser.verificationStatus || 'verified',
    customerProfile: rawUser.customerProfile || {},
    driverProfile: rawUser.driverProfile || {},
    staffProfile: rawUser.staffProfile || {},
    adminProfile: rawUser.adminProfile || {},
    providerApplications: sortProviderApplications(rawUser.providerApplications || []),
    isSystemAdmin: Boolean(rawUser.isSystemAdmin),
    unreadNotificationCount,
    lastLoginAt: rawUser.lastLoginAt || null,
    deactivatedAt: rawUser.deactivatedAt || null,
    createdAt: rawUser.createdAt,
    updatedAt: rawUser.updatedAt
  };
};

module.exports = {
  ROLE_KEYS,
  PROVIDER_ROLE_KEYS,
  ACCOUNT_STATUSES,
  ROLE_STATUSES,
  VERIFICATION_STATUSES,
  APPLICATION_STATUSES,
  PERMISSIONS,
  ROLE_PERMISSION_MAP,
  buildRoleAssignment,
  getRoleAssignment,
  getPrimaryRole,
  getProviderApplicationsForRole,
  getLatestProviderApplication,
  getLatestPendingProviderApplication,
  getLatestApprovedProviderApplication,
  isBlockedRole,
  canUseRole,
  canManageRoleProfile,
  getUsableRoleAssignments,
  getPermissionsForRole,
  getPermissionsForUser,
  hasPermission,
  normalizeRoleAssignment,
  validateManagedUserState,
  syncUserRoles,
  createProviderApplication,
  serializeUser
};
