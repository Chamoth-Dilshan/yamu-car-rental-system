const {
  computeProfileCompletion,
  normalizeDriverDocuments,
  normalizeStaffDocuments,
  trimValue
} = require('./profileHelpers');

const ROLE_KEYS = ['customer', 'driver', 'staff', 'admin'];
const PROVIDER_ROLE_KEYS = ['driver', 'staff'];
const ACCOUNT_STATUSES = ['active', 'suspended', 'deactivated'];
const ROLE_STATUSES = ['pending', 'active', 'rejected', 'suspended', 'deactivated'];
const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];
const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];
const PERMISSIONS = ['users.view', 'users.edit', 'roles.review', 'roles.assign', 'profile.manage', 'bookings.manage'];
const PROVIDER_REQUIREMENT_CONFIG = {
  driver: {
    fields: [
      { key: 'drivingLicenseNumber', label: 'Driving license number' },
      { key: 'nicId', label: 'NIC / ID' },
      { key: 'serviceArea', label: 'Service area' }
    ],
    documents: [
      { key: 'nicDocument', label: 'NIC / ID document' },
      { key: 'drivingLicenseDocument', label: 'Driving license document' },
      { key: 'proofOfAddressDocument', label: 'Proof of address document' }
    ]
  },
  staff: {
    fields: [
      { key: 'storeName', label: 'Store name' },
      { key: 'businessRegistrationNumber', label: 'Business registration number' },
      { key: 'storeAddress', label: 'Store address' },
      { key: 'storeContactNumber', label: 'Store contact number' },
      { key: 'storeEmail', label: 'Store email' }
    ],
    documents: [
      { key: 'businessRegistrationDocument', label: 'Business registration document' },
      { key: 'proofOfAddressDocument', label: 'Proof of address document' }
    ]
  }
};

const ROLE_PERMISSION_MAP = {
  customer: ['profile.manage'],
  driver: ['profile.manage'],
  staff: ['profile.manage'],
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

const toDisplayLabel = (value = '') => (
  String(value)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
);

const getVerificationTone = (state) => {
  switch (state) {
    case 'approved':
      return 'success';
    case 'pending_review':
    case 'not_started':
      return 'info';
    case 'missing_requirements':
    case 'withdrawn':
    case 'not_assigned':
      return 'warning';
    case 'rejected':
    case 'restricted':
      return 'danger';
    default:
      return 'info';
  }
};

const getRoleAssignment = (user, roleKey) => user?.roles?.find((item) => item.roleKey === roleKey);
const getProviderRequirementConfig = (roleKey) => PROVIDER_REQUIREMENT_CONFIG[roleKey] || { fields: [], documents: [] };

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
const hasAnyPermission = (user, permissions = [], roleKey = user?.role) => (
  permissions.some((permission) => getPermissionsForUser(user, roleKey).includes(permission))
);
const hasAllPermissions = (user, permissions = [], roleKey = user?.role) => (
  permissions.every((permission) => getPermissionsForUser(user, roleKey).includes(permission))
);

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

const isProvided = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => isProvided(item));
  }

  return Boolean(trimValue(value, ''));
};

const getVerificationRequirements = (user, roleKey) => {
  const config = getProviderRequirementConfig(roleKey);
  const profile = roleKey === 'driver' ? user?.driverProfile : user?.staffProfile;

  return [
    ...config.fields.map(({ key, label }) => [label, profile?.[key]]),
    ...config.documents.map(({ key, label }) => [label, profile?.documents?.[key]])
  ];
};

const buildVerificationGuidance = ({
  roleKey,
  accountStatus,
  roleAssignment,
  latestApplication,
  missingRequirements
}) => {
  if (accountStatus !== 'active') {
    return accountStatus === 'suspended'
      ? 'Your account is suspended. Contact support or an administrator for help.'
      : 'Your account is deactivated. Access must be restored before role changes can be used.';
  }

  if (roleAssignment?.roleStatus === 'suspended' || roleAssignment?.roleStatus === 'deactivated') {
    return `Your ${roleKey} access is currently restricted. Contact an administrator for help.`;
  }

  if (canUseRole(roleAssignment)) {
    return roleKey === 'customer'
      ? 'Your customer access is active and ready to use.'
      : roleKey === 'admin'
        ? 'Your admin access is active and verified.'
        : `Your ${roleKey} role is approved and ready to use.`;
  }

  if (latestApplication?.status === 'pending') {
    return `Your ${roleKey} application is waiting for admin review.`;
  }

  if (latestApplication?.status === 'rejected') {
    return latestApplication.rejectionReason
      ? `Update the rejected items and reapply for ${roleKey} access.`
      : `Review the rejected ${roleKey} application and reapply when ready.`;
  }

  if (latestApplication?.status === 'withdrawn') {
    return `Your previous ${roleKey} application was withdrawn. Complete the remaining items before applying again.`;
  }

  if (missingRequirements.length > 0) {
    return `Complete the missing ${roleKey} requirements before applying for review.`;
  }

  if (roleKey === 'customer') {
    return 'Keep your account details current so booking and support workflows stay smooth.';
  }

  if (roleKey === 'admin') {
    return 'Admin access is only available when granted by the platform team.';
  }

  return `You can apply for ${roleKey} access once the required details are filled in.`;
};

const buildVerificationItem = (user, roleKey) => {
  const roleAssignment = getRoleAssignment(user, roleKey);
  const latestApplication = getLatestProviderApplication(user, roleKey);
  const missingRequirements = getVerificationRequirements(user, roleKey)
    .filter(([, value]) => !isProvided(value))
    .map(([label]) => label);
  let state = 'not_started';

  if (user?.accountStatus !== 'active') {
    state = 'restricted';
  } else if (roleAssignment?.roleStatus === 'suspended' || roleAssignment?.roleStatus === 'deactivated') {
    state = 'restricted';
  } else if (canUseRole(roleAssignment)) {
    state = 'approved';
  } else if (latestApplication?.status === 'pending') {
    state = 'pending_review';
  } else if (latestApplication?.status === 'rejected' || roleAssignment?.verificationStatus === 'rejected') {
    state = 'rejected';
  } else if (missingRequirements.length > 0 && PROVIDER_ROLE_KEYS.includes(roleKey)) {
    state = 'missing_requirements';
  } else if (latestApplication?.status === 'withdrawn') {
    state = 'withdrawn';
  } else if (roleKey === 'customer' || roleKey === 'admin') {
    state = roleAssignment ? 'approved' : 'not_assigned';
  }

  return {
    roleKey,
    roleLabel: roleKey.charAt(0).toUpperCase() + roleKey.slice(1),
    state,
    stateLabel: toDisplayLabel(state),
    tone: getVerificationTone(state),
    roleStatus: roleAssignment?.roleStatus || (roleKey === 'customer' ? 'active' : 'not_assigned'),
    verificationStatus: roleAssignment?.verificationStatus || (roleKey === 'customer' ? 'verified' : 'unverified'),
    applicationStatus: latestApplication?.status || 'not_submitted',
    rejectionReason: latestApplication?.rejectionReason || '',
    lastReviewedAt: latestApplication?.reviewedAt || null,
    lastSubmittedAt: latestApplication?.submittedAt || null,
    missingRequirements,
    guidance: buildVerificationGuidance({
      roleKey,
      accountStatus: user?.accountStatus,
      roleAssignment,
      latestApplication,
      missingRequirements
    })
  };
};

const buildVerificationCenter = (user, activeRole) => {
  const roleChecks = [
    buildVerificationItem(user, 'customer'),
    buildVerificationItem(user, 'driver'),
    buildVerificationItem(user, 'staff')
  ];

  if (getRoleAssignment(user, 'admin')) {
    roleChecks.push(buildVerificationItem(user, 'admin'));
  }

  return {
    accountStatus: user?.accountStatus || 'active',
    accountStatusLabel: toDisplayLabel(user?.accountStatus || 'active'),
    accountStatusTone: user?.accountStatus === 'active' ? 'success' : 'danger',
    activeRole,
    accountGuidance: user?.accountStatus === 'active'
      ? 'Your account is active. Keep your role details complete so reviews move faster.'
      : user?.accountStatus === 'suspended'
        ? 'Your account is suspended. Contact support or an administrator to restore access.'
        : 'Your account is deactivated. Access must be restored before you can use role workflows.',
    currentRole: roleChecks.find((item) => item.roleKey === activeRole) || null,
    roleChecks
  };
};

const buildAccountHealth = (user, activeRole) => {
  const profileCompletion = computeProfileCompletion(user);
  const verificationCenter = buildVerificationCenter(user, activeRole);
  const providerRoleChecks = (verificationCenter.roleChecks || []).filter((item) => PROVIDER_ROLE_KEYS.includes(item.roleKey));
  const pendingApplicationsCount = (user?.providerApplications || []).filter((item) => item.status === 'pending').length;
  const unreadNotificationsCount = (user?.notifications || []).filter((item) => !item.isRead).length;
  const currentVerification = verificationCenter.currentRole || buildVerificationItem(user, activeRole || 'customer');
  const nextRoleAction = providerRoleChecks.find((item) => item.applicationStatus === 'pending')
    || providerRoleChecks.find((item) => item.state === 'rejected')
    || providerRoleChecks.find((item) => item.state === 'missing_requirements')
    || providerRoleChecks.find((item) => ['not_started', 'withdrawn', 'not_assigned'].includes(item.state))
    || null;

  return {
    accountStatus: user?.accountStatus || 'active',
    accountStatusLabel: toDisplayLabel(user?.accountStatus || 'active'),
    accountStatusTone: user?.accountStatus === 'active' ? 'success' : 'danger',
    activeRole,
    activeRoleLabel: toDisplayLabel(activeRole || 'customer'),
    primaryRole: getPrimaryRole(user),
    primaryRoleLabel: toDisplayLabel(getPrimaryRole(user) || 'customer'),
    profileCompletionPercent: profileCompletion.percent || 0,
    pendingApplicationsCount,
    unreadNotificationsCount,
    verificationState: currentVerification.state,
    verificationStateLabel: currentVerification.stateLabel,
    verificationTone: currentVerification.tone,
    nextRoleAction: nextRoleAction
      ? {
          roleKey: nextRoleAction.roleKey,
          roleLabel: nextRoleAction.roleLabel,
          state: nextRoleAction.state,
          stateLabel: nextRoleAction.stateLabel,
          tone: nextRoleAction.tone,
          guidance: nextRoleAction.guidance,
          missingRequirements: nextRoleAction.missingRequirements || []
        }
      : {
          roleKey: '',
          roleLabel: '',
          state: 'approved',
          stateLabel: 'All Set',
          tone: 'success',
          guidance: 'Your profile and current roles are in a usable state. No immediate role action is required.',
          missingRequirements: []
        }
  };
};

const serializeUser = (userDoc) => {
  const rawUser = userDoc?.toObject ? userDoc.toObject() : { ...userDoc };
  const driverProfile = {
    ...(rawUser.driverProfile || {}),
    documents: normalizeDriverDocuments(rawUser.driverProfile?.documents || {})
  };
  const staffProfile = {
    ...(rawUser.staffProfile || {}),
    documents: normalizeStaffDocuments(rawUser.staffProfile?.documents || {})
  };
  const providerApplications = sortProviderApplications(rawUser.providerApplications || []).map((application) => {
    if (application.roleKey === 'driver') {
      return {
        ...application,
        applicationData: {
          ...(application.applicationData || {}),
          documents: normalizeDriverDocuments(application.applicationData?.documents || {})
        }
      };
    }

    if (application.roleKey === 'staff') {
      return {
        ...application,
        applicationData: {
          ...(application.applicationData || {}),
          documents: normalizeStaffDocuments(application.applicationData?.documents || {})
        }
      };
    }

    return application;
  });
  const normalizedUser = {
    ...rawUser,
    driverProfile,
    staffProfile,
    providerApplications
  };
  const roles = ensureSinglePrimaryRole(
    (Array.isArray(normalizedUser.roles) ? normalizedUser.roles : []).map((role) => normalizeRoleAssignment(role)).filter(Boolean)
  );
  const preferredActiveRole = normalizedUser.role;
  const activeRole = roles.find((item) => item.roleKey === preferredActiveRole)
    ? preferredActiveRole
    : (roles.find((item) => canUseRole(item))?.roleKey || roles[0]?.roleKey || null);
  const primaryRole = roles.find((item) => item.isPrimary)?.roleKey || roles[0]?.roleKey || null;
  const activeRoleAssignment = roles.find((item) => item.roleKey === activeRole);
  const unreadNotificationCount = (normalizedUser.notifications || []).filter((item) => !item.isRead).length;
  const verificationCenter = buildVerificationCenter(normalizedUser, activeRole);
  const accountHealth = buildAccountHealth(normalizedUser, activeRole);

  return {
    _id: normalizedUser._id,
    username: normalizedUser.username,
    fullName: normalizedUser.fullName,
    email: normalizedUser.email,
    phone: normalizedUser.phone || '',
    address: normalizedUser.address || '',
    city: normalizedUser.city || '',
    dob: normalizedUser.dob || '',
    bio: normalizedUser.bio || '',
    preferredLanguage: normalizedUser.preferredLanguage || 'English',
    emergencyContact: normalizedUser.emergencyContact || { name: '', phone: '', relationship: '' },
    profileCompletion: computeProfileCompletion(normalizedUser),
    permissions: getPermissionsForUser(normalizedUser, activeRole),
    profilePic: normalizedUser.profilePic || 'avatar.png',
    role: activeRole,
    activeRole,
    primaryRole,
    roles,
    accountStatus: normalizedUser.accountStatus,
    verificationStatus: activeRoleAssignment?.verificationStatus || normalizedUser.verificationStatus || 'verified',
    driverProfile,
    staffProfile,
    adminProfile: normalizedUser.adminProfile || {},
    providerApplications,
    verificationCenter,
    accountHealth,
    isSystemAdmin: Boolean(normalizedUser.isSystemAdmin),
    unreadNotificationCount,
    lastLoginAt: normalizedUser.lastLoginAt || null,
    deactivatedAt: normalizedUser.deactivatedAt || null,
    createdAt: normalizedUser.createdAt,
    updatedAt: normalizedUser.updatedAt
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
  PROVIDER_REQUIREMENT_CONFIG,
  ROLE_PERMISSION_MAP,
  buildRoleAssignment,
  getRoleAssignment,
  getProviderRequirementConfig,
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
  hasAnyPermission,
  hasAllPermissions,
  normalizeRoleAssignment,
  validateManagedUserState,
  syncUserRoles,
  createProviderApplication,
  serializeUser
};
