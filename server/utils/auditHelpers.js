const AuditLog = require('../models/AuditLog');
const { getPrimaryRole } = require('./roleHelpers');

const toPlain = (value) => (value?.toObject ? value.toObject() : value);
const ROLE_HISTORY_ACTIONS = [
  'user.provider_application.submitted',
  'user.provider_application.withdrawn',
  'admin.provider_application.approved',
  'admin.provider_application.rejected',
  'user.active_role.switched',
  'admin.active_role.updated',
  'admin.primary_role.updated',
  'admin.role_state.updated'
];
const roleLabel = (value = '') => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Role';

const mapRolesByKey = (snapshot = {}) => Object.fromEntries(
  (snapshot?.roles || []).map((role) => [role.roleKey, role])
);

const getLatestApplicationByRole = (snapshot = {}) => {
  const nextMap = {};

  (snapshot?.providerApplications || []).forEach((application) => {
    const existing = nextMap[application.roleKey];
    const currentTime = new Date(application?.reviewedAt || application?.submittedAt || 0).valueOf();
    const existingTime = new Date(existing?.reviewedAt || existing?.submittedAt || 0).valueOf();

    if (!existing || currentTime >= existingTime) {
      nextMap[application.roleKey] = application;
    }
  });

  return nextMap;
};

const inferProviderApplicationRole = (log) => {
  if (log?.reason && ['driver', 'staff'].includes(log.reason)) {
    return log.reason;
  }

  const beforeApplications = getLatestApplicationByRole(log?.beforeSnapshot || {});
  const afterApplications = getLatestApplicationByRole(log?.afterSnapshot || {});
  const changedRole = Object.keys(afterApplications).find((roleKey) => (
    beforeApplications[roleKey]?.status !== afterApplications[roleKey]?.status
  ));

  if (changedRole) {
    return changedRole;
  }

  const beforeRoles = mapRolesByKey(log?.beforeSnapshot || {});
  const afterRoles = mapRolesByKey(log?.afterSnapshot || {});

  return Object.keys(afterRoles).find((roleKey) => (
    beforeRoles[roleKey]?.roleStatus !== afterRoles[roleKey]?.roleStatus
    || beforeRoles[roleKey]?.verificationStatus !== afterRoles[roleKey]?.verificationStatus
  )) || '';
};

const buildActorSummary = (log, targetUserId) => {
  const actor = toPlain(log?.actorUserId) || {};
  const actorId = String(actor?._id || log?.actorUserId || '');
  const targetId = String(targetUserId || '');

  return {
    _id: actorId || null,
    fullName: actor?.fullName || 'System',
    email: actor?.email || '',
    isSelf: Boolean(actorId && targetId && actorId === targetId)
  };
};

const buildRoleStateHistoryItems = (log, targetUserId) => {
  const beforeRoles = mapRolesByKey(log?.beforeSnapshot || {});
  const afterRoles = mapRolesByKey(log?.afterSnapshot || {});
  const actor = buildActorSummary(log, targetUserId);

  return Object.keys(afterRoles).flatMap((roleKey) => {
    const beforeRole = beforeRoles[roleKey];
    const afterRole = afterRoles[roleKey];

    if (!beforeRole || !afterRole || beforeRole.roleStatus === afterRole.roleStatus) {
      return [];
    }

    if (afterRole.roleStatus === 'suspended' || afterRole.roleStatus === 'deactivated') {
      return [{
        id: `${log._id}-${roleKey}-status`,
        type: 'role_suspended',
        roleKey,
        title: `${roleLabel(roleKey)} role ${afterRole.roleStatus === 'deactivated' ? 'deactivated' : 'suspended'}`,
        description: `${actor.isSelf ? 'You' : actor.fullName} changed the ${roleKey} role from ${beforeRole.roleStatus} to ${afterRole.roleStatus}.`,
        actor,
        createdAt: log.createdAt
      }];
    }

    if (afterRole.roleStatus === 'active' && ['suspended', 'deactivated'].includes(beforeRole.roleStatus)) {
      return [{
        id: `${log._id}-${roleKey}-status`,
        type: 'role_reactivated',
        roleKey,
        title: `${roleLabel(roleKey)} role reactivated`,
        description: `${actor.isSelf ? 'You' : actor.fullName} restored the ${roleKey} role from ${beforeRole.roleStatus} to active.`,
        actor,
        createdAt: log.createdAt
      }];
    }

    return [];
  });
};

const buildRoleHistoryItemsFromLog = (log, targetUserId) => {
  const actor = buildActorSummary(log, targetUserId);
  const actorName = actor.isSelf ? 'You' : actor.fullName;

  switch (log.actionType) {
    case 'user.provider_application.submitted': {
      const roleKey = inferProviderApplicationRole(log);
      return [{
        id: `${log._id}-requested`,
        type: 'role_requested',
        roleKey,
        title: `${roleLabel(roleKey)} application submitted`,
        description: `${actorName} submitted a ${roleKey} application for review.`,
        actor,
        createdAt: log.createdAt
      }];
    }
    case 'user.provider_application.withdrawn': {
      const roleKey = inferProviderApplicationRole(log);
      return [{
        id: `${log._id}-withdrawn`,
        type: 'role_withdrawn',
        roleKey,
        title: `${roleLabel(roleKey)} request withdrawn`,
        description: `${actorName} withdrew the pending ${roleKey} application.`,
        actor,
        createdAt: log.createdAt
      }];
    }
    case 'admin.provider_application.approved': {
      const roleKey = inferProviderApplicationRole(log);
      return [{
        id: `${log._id}-approved`,
        type: 'role_approved',
        roleKey,
        title: `${roleLabel(roleKey)} role approved`,
        description: `${actorName} approved the ${roleKey} application.`,
        actor,
        createdAt: log.createdAt
      }];
    }
    case 'admin.provider_application.rejected': {
      const roleKey = inferProviderApplicationRole(log);
      return [{
        id: `${log._id}-rejected`,
        type: 'role_rejected',
        roleKey,
        title: `${roleLabel(roleKey)} role rejected`,
        description: log.reason
          ? `${actorName} rejected the ${roleKey} application: ${log.reason}`
          : `${actorName} rejected the ${roleKey} application.`,
        actor,
        reason: log.reason || '',
        createdAt: log.createdAt
      }];
    }
    case 'user.active_role.switched':
    case 'admin.active_role.updated': {
      const fromRole = log?.beforeSnapshot?.activeRole || '';
      const toRole = log?.afterSnapshot?.activeRole || '';

      return [{
        id: `${log._id}-switched`,
        type: 'role_switched',
        roleKey: toRole,
        title: `Active role switched to ${roleLabel(toRole)}`,
        description: `${actorName} changed the active role from ${roleLabel(fromRole)} to ${roleLabel(toRole)}.`,
        actor,
        createdAt: log.createdAt
      }];
    }
    case 'admin.primary_role.updated': {
      const fromRole = log?.beforeSnapshot?.primaryRole || '';
      const toRole = log?.afterSnapshot?.primaryRole || '';

      return [{
        id: `${log._id}-primary`,
        type: 'primary_role_changed',
        roleKey: toRole,
        title: `Primary role changed to ${roleLabel(toRole)}`,
        description: `${actorName} changed the primary role from ${roleLabel(fromRole)} to ${roleLabel(toRole)}.`,
        actor,
        createdAt: log.createdAt
      }];
    }
    case 'admin.role_state.updated':
      return buildRoleStateHistoryItems(log, targetUserId);
    default:
      return [];
  }
};

const buildUserAuditSnapshot = (user) => {
  const rawUser = toPlain(user) || {};

  return {
    fullName: rawUser.fullName || '',
    username: rawUser.username || '',
    email: rawUser.email || '',
    phone: rawUser.phone || '',
    address: rawUser.address || '',
    city: rawUser.city || '',
    dob: rawUser.dob || '',
    bio: rawUser.bio || '',
    profilePic: rawUser.profilePic || '',
    accountStatus: rawUser.accountStatus || '',
    activeRole: rawUser.role || '',
    primaryRole: getPrimaryRole(rawUser),
    roles: (rawUser.roles || []).map((role) => ({
      roleKey: role.roleKey,
      roleStatus: role.roleStatus,
      verificationStatus: role.verificationStatus,
      isPrimary: Boolean(role.isPrimary)
    })),
    preferredLanguage: rawUser.preferredLanguage || 'English',
    emergencyContact: rawUser.emergencyContact || {},
    customerProfile: {
      preferences: rawUser.customerProfile?.preferences || '',
      notes: rawUser.customerProfile?.notes || ''
    },
    driverProfile: {
      drivingLicenseNumber: rawUser.driverProfile?.drivingLicenseNumber || '',
      licenseExpiryDate: rawUser.driverProfile?.licenseExpiryDate || null,
      nicId: rawUser.driverProfile?.nicId || '',
      serviceArea: rawUser.driverProfile?.serviceArea || '',
      providerDetails: rawUser.driverProfile?.providerDetails || '',
      documents: rawUser.driverProfile?.documents || {}
    },
    staffProfile: {
      storeName: rawUser.staffProfile?.storeName || '',
      storeOwner: rawUser.staffProfile?.storeOwner || '',
      businessRegistrationNumber: rawUser.staffProfile?.businessRegistrationNumber || '',
      storeAddress: rawUser.staffProfile?.storeAddress || '',
      storeContactNumber: rawUser.staffProfile?.storeContactNumber || '',
      storeEmail: rawUser.staffProfile?.storeEmail || '',
      documents: rawUser.staffProfile?.documents || {}
    },
    adminProfile: {
      accessScope: rawUser.adminProfile?.accessScope || '',
      controlNotes: rawUser.adminProfile?.controlNotes || ''
    },
    providerApplications: (rawUser.providerApplications || []).map((application) => ({
      roleKey: application.roleKey,
      status: application.status,
      submittedAt: application.submittedAt || null,
      reviewedAt: application.reviewedAt || null,
      rejectionReason: application.rejectionReason || '',
      applicationData: application.applicationData || {}
    }))
  };
};

const logAuditEvent = async ({
  actorUserId,
  targetUserId,
  actionType,
  beforeSnapshot = null,
  afterSnapshot = null,
  reason = ''
}) => {
  if (!actorUserId || !targetUserId || !actionType) {
    return null;
  }

  return AuditLog.create({
    actorUserId,
    targetUserId,
    actionType,
    beforeSnapshot,
    afterSnapshot,
    reason
  });
};

const getRoleHistoryTimeline = async (targetUserId, limit = 20) => {
  if (!targetUserId) {
    return [];
  }

  const auditLogs = await AuditLog.find({
    targetUserId,
    actionType: { $in: ROLE_HISTORY_ACTIONS }
  })
    .populate('actorUserId', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit);

  return auditLogs
    .flatMap((log) => buildRoleHistoryItemsFromLog(log, targetUserId))
    .sort((left, right) => new Date(right.createdAt).valueOf() - new Date(left.createdAt).valueOf());
};

module.exports = {
  buildUserAuditSnapshot,
  logAuditEvent,
  getRoleHistoryTimeline
};
