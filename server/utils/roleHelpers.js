const ROLE_KEYS = ['customer', 'driver', 'staff', 'admin'];
const PROVIDER_ROLE_KEYS = ['driver', 'staff'];
const ACCOUNT_STATUSES = ['active', 'suspended', 'deactivated'];
const ROLE_STATUSES = ['pending', 'active', 'verified', 'rejected', 'suspended', 'deactivated'];
const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];
const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];

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
  && ['active', 'verified'].includes(assignment.roleStatus)
  && assignment.verificationStatus === 'verified'
);

const canManageRoleProfile = (assignment) => (
  !!assignment
  && ['pending', 'active', 'verified'].includes(assignment.roleStatus)
  && ['pending', 'verified'].includes(assignment.verificationStatus)
);

const getUsableRoleAssignments = (user) => (user?.roles || []).filter((role) => canUseRole(role));

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
    if (!ROLE_KEYS.includes(role.roleKey)) {
      return;
    }

    if (uniqueRoles.some((item) => item.roleKey === role.roleKey)) {
      return;
    }

    uniqueRoles.push({
      roleKey: role.roleKey,
      roleStatus: ROLE_STATUSES.includes(role.roleStatus) ? role.roleStatus : 'active',
      verificationStatus: VERIFICATION_STATUSES.includes(role.verificationStatus)
        ? role.verificationStatus
        : 'verified',
      isPrimary: Boolean(role.isPrimary)
    });
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

const getLatestProviderApplication = (user, roleKey) => (
  user?.providerApplications?.find((item) => item.roleKey === roleKey) || null
);

const upsertProviderApplication = (user, roleKey, applicationData) => {
  const existing = getLatestProviderApplication(user, roleKey);
  const nextData = {
    roleKey,
    status: 'pending',
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: '',
    applicationData
  };

  if (existing) {
    existing.status = nextData.status;
    existing.submittedAt = nextData.submittedAt;
    existing.reviewedAt = nextData.reviewedAt;
    existing.reviewedBy = nextData.reviewedBy;
    existing.rejectionReason = nextData.rejectionReason;
    existing.applicationData = nextData.applicationData;
    return existing;
  }

  user.providerApplications.push(nextData);
  return user.providerApplications[user.providerApplications.length - 1];
};

const serializeUser = (userDoc) => {
  const rawUser = userDoc?.toObject ? userDoc.toObject() : { ...userDoc };
  const roles = Array.isArray(rawUser.roles) ? rawUser.roles : [];
  const activeRole = rawUser.role;
  const primaryRole = roles.find((item) => item.isPrimary)?.roleKey || roles[0]?.roleKey || null;
  const activeRoleAssignment = roles.find((item) => item.roleKey === activeRole);

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
    providerApplications: rawUser.providerApplications || [],
    lastLoginAt: rawUser.lastLoginAt || null,
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
  buildRoleAssignment,
  getRoleAssignment,
  getPrimaryRole,
  getLatestProviderApplication,
  isBlockedRole,
  canUseRole,
  canManageRoleProfile,
  getUsableRoleAssignments,
  syncUserRoles,
  upsertProviderApplication,
  serializeUser
};
