const AuditLog = require('../models/AuditLog');
const { getPrimaryRole } = require('./roleHelpers');

const toPlain = (value) => (value?.toObject ? value.toObject() : value);

const buildUserAuditSnapshot = (user) => {
  const rawUser = toPlain(user) || {};

  return {
    fullName: rawUser.fullName || '',
    username: rawUser.username || '',
    email: rawUser.email || '',
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
    driverProfile: {
      drivingLicenseNumber: rawUser.driverProfile?.drivingLicenseNumber || '',
      nicId: rawUser.driverProfile?.nicId || '',
      serviceArea: rawUser.driverProfile?.serviceArea || '',
      documents: rawUser.driverProfile?.documents || {}
    },
    staffProfile: {
      storeName: rawUser.staffProfile?.storeName || '',
      businessRegistrationNumber: rawUser.staffProfile?.businessRegistrationNumber || '',
      storeEmail: rawUser.staffProfile?.storeEmail || '',
      documents: rawUser.staffProfile?.documents || {}
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

module.exports = {
  buildUserAuditSnapshot,
  logAuditEvent
};
