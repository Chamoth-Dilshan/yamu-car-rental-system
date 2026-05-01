const User = require('./user.model');
const { sendServerError } = require('../../utils/errorResponses');
const { buildUserAuditSnapshot, logAuditEvent, getRoleHistoryTimeline } = require('../../utils/auditHelpers');
const {
  addNotificationToAdmins,
  appendNotification,
  getUnreadNotificationCount,
  serializeNotification
} = require('../../utils/notificationHelpers');
const {
  PROVIDER_ROLE_KEYS,
  buildRoleAssignment,
  canManageRoleProfile,
  canUseRole,
  createProviderApplication,
  getLatestPendingProviderApplication,
  getProviderRequirementConfig,
  getRoleAssignment,
  serializeUser,
  syncUserRoles,
} = require('../../utils/roleHelpers');
const {
  hasDocumentFile,
  mergeDriverDocuments,
  mergeStaffDocuments,
  normalizeEmergencyContact,
  normalizeDriverDocuments,
  normalizePreferredLanguage,
  normalizeStaffDocuments,
  parseDate,
  setDocumentCollectionStatus,
  trimValue,
  validateRequiredTextFields,
  validatePasswordStrength
} = require('../../utils/profileHelpers');

const roleLabel = (value) => ({
  customer: 'User',
  staff: 'Store',
  driver: 'Driver',
  admin: 'Admin'
}[value] || value.charAt(0).toUpperCase() + value.slice(1));

const ensureUniqueIdentityFields = async (userId, email, username) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim().toLowerCase();

  const existing = await User.findOne({
    _id: { $ne: userId },
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
  });

  if (existing) {
    throw new Error('Email or username is already in use');
  }

  return { normalizedEmail, normalizedUsername };
};

const getPlainObject = (value) => (value?.toObject ? value.toObject() : (value || {}));

const buildDriverProfilePayload = (payload = {}, currentProfile = {}) => {
  const current = getPlainObject(currentProfile);

  return {
    drivingLicenseNumber: trimValue(payload.drivingLicenseNumber, current.drivingLicenseNumber || ''),
    licenseExpiryDate: parseDate(payload.licenseExpiryDate) || null,
    nicId: trimValue(payload.nicId, current.nicId || ''),
    serviceArea: trimValue(payload.serviceArea, current.serviceArea || ''),
    providerDetails: trimValue(payload.providerDetails, current.providerDetails || ''),
    documents: mergeDriverDocuments(payload.documents || {}, current.documents || {})
  };
};

const buildStaffProfilePayload = (payload = {}, currentProfile = {}) => {
  const current = getPlainObject(currentProfile);

  return {
    storeName: trimValue(payload.storeName, current.storeName || ''),
    storeOwner: trimValue(payload.storeOwner, current.storeOwner || ''),
    businessRegistrationNumber: trimValue(payload.businessRegistrationNumber, current.businessRegistrationNumber || ''),
    storeAddress: trimValue(payload.storeAddress, current.storeAddress || ''),
    storeContactNumber: trimValue(payload.storeContactNumber, current.storeContactNumber || ''),
    storeEmail: trimValue(payload.storeEmail, current.storeEmail || ''),
    documents: mergeStaffDocuments(payload.documents || {}, current.documents || {})
  };
};

const validateProviderApplicationData = (roleKey, applicationData = {}) => {
  const { fields, documents } = getProviderRequirementConfig(roleKey);
  const missingField = fields.find(({ key }) => !trimValue(applicationData[key], ''));

  if (missingField) {
    return { valid: false, message: `Missing required field: ${missingField.label}` };
  }

  const nextDocuments = applicationData.documents || {};
  const missingDocument = documents.find(({ key }) => !hasDocumentFile(nextDocuments?.[key] || {}));

  if (missingDocument) {
    return { valid: false, message: `Missing required document metadata: ${missingDocument.label}` };
  }

  return { valid: true };
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    syncUserRoles(user);
    res.json(serializeUser(user));
  } catch (error) {
    sendServerError(res, error, 'Failed to load profile');
  }
};

const getMyRoleHistory = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const items = await getRoleHistoryTimeline(req.user._id, limit);

    res.json({ items });
  } catch (error) {
    sendServerError(res, error, 'Failed to load role history');
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const nextEmail = req.body.email || user.email;
    const nextUsername = req.body.username || user.username || nextEmail;
    const missingIdentityField = validateRequiredTextFields([
      ['Full name', req.body.fullName ?? user.fullName],
      ['Email', nextEmail],
      ['Username', nextUsername]
    ]);

    if (missingIdentityField) {
      return res.status(400).json({ message: `${missingIdentityField} is required` });
    }

    const { normalizedEmail, normalizedUsername } = await ensureUniqueIdentityFields(
      user._id,
      nextEmail,
      nextUsername
    );

    if (req.body.password) {
      const passwordError = validatePasswordStrength(req.body.password);
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }

      if (!req.body.currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }

      if (!(await user.matchPassword(req.body.currentPassword))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    user.fullName = trimValue(req.body.fullName, user.fullName);
    user.email = normalizedEmail;
    user.username = normalizedUsername;
    user.phone = trimValue(req.body.phone, '');
    user.address = trimValue(req.body.address, '');
    user.city = trimValue(req.body.city, '');
    user.dob = trimValue(req.body.dob, '');
    user.bio = trimValue(req.body.bio, '');
    user.preferredLanguage = normalizePreferredLanguage(req.body.preferredLanguage, user.preferredLanguage || 'English');
    user.emergencyContact = normalizeEmergencyContact({
      name: req.body.emergencyContactName,
      phone: req.body.emergencyContactPhone,
      relationship: req.body.emergencyContactRelationship
    });

    if (req.file) {
      user.profilePic = `profiles/${req.file.filename}`;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();
    await logAuditEvent({
      actorUserId: user._id,
      targetUserId: user._id,
      actionType: 'user.profile.updated',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user)
    });

    res.json(serializeUser(user));
  } catch (error) {
    if (error.code === 11000 || error.message === 'Email or username is already in use') {
      return res.status(400).json({ message: 'Email or username is already in use' });
    }

    sendServerError(res, error, 'Failed to update profile');
  }
};

const updateDriverProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roleAssignment = getRoleAssignment(user, 'driver');
    if (!canManageRoleProfile(roleAssignment)) {
      return res.status(403).json({ message: 'Driver onboarding is available only for assigned driver applicants or roles' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    const documentKeys = getProviderRequirementConfig('driver').documents.map(({ key }) => key);
    user.driverProfile = {
      ...getPlainObject(user.driverProfile),
      ...buildDriverProfilePayload(req.body, user.driverProfile)
    };

    const pendingApplication = getLatestPendingProviderApplication(user, 'driver');
    if (pendingApplication?.status === 'pending') {
      user.driverProfile.documents = setDocumentCollectionStatus(user.driverProfile.documents, documentKeys, { status: 'pending' });
      pendingApplication.applicationData = {
        ...pendingApplication.applicationData,
        ...getPlainObject(user.driverProfile),
        documents: setDocumentCollectionStatus(
          normalizeDriverDocuments(getPlainObject(user.driverProfile)?.documents || {}),
          documentKeys,
          { status: 'pending' }
        )
      };
      pendingApplication.submittedAt = new Date();
    }

    await user.save({ validateModifiedOnly: true });
    await logAuditEvent({
      actorUserId: user._id,
      targetUserId: user._id,
      actionType: 'user.driver_profile.updated',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user)
    });
    res.json({
      message: 'Driver profile updated',
      driverProfile: user.driverProfile,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to update driver profile');
  }
};

const updateStaffProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roleAssignment = getRoleAssignment(user, 'staff');
    if (!canManageRoleProfile(roleAssignment)) {
      return res.status(403).json({ message: 'Store onboarding is available only for assigned store applicants or roles' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    const documentKeys = getProviderRequirementConfig('staff').documents.map(({ key }) => key);
    user.staffProfile = {
      ...getPlainObject(user.staffProfile),
      ...buildStaffProfilePayload(req.body, user.staffProfile)
    };

    const pendingApplication = getLatestPendingProviderApplication(user, 'staff');
    if (pendingApplication?.status === 'pending') {
      user.staffProfile.documents = setDocumentCollectionStatus(user.staffProfile.documents, documentKeys, { status: 'pending' });
      pendingApplication.applicationData = {
        ...pendingApplication.applicationData,
        ...getPlainObject(user.staffProfile),
        documents: setDocumentCollectionStatus(
          normalizeStaffDocuments(getPlainObject(user.staffProfile)?.documents || {}),
          documentKeys,
          { status: 'pending' }
        )
      };
      pendingApplication.submittedAt = new Date();
    }

    await user.save({ validateModifiedOnly: true });
    await logAuditEvent({
      actorUserId: user._id,
      targetUserId: user._id,
      actionType: 'user.staff_profile.updated',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user)
    });
    res.json({
      message: 'Store profile updated',
      staffProfile: user.staffProfile,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to update store profile');
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roleAssignment = getRoleAssignment(user, 'admin');
    if (!canUseRole(roleAssignment)) {
      return res.status(403).json({ message: 'Admin profile access is restricted to admin users' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    user.adminProfile = {
      ...user.adminProfile,
      accessScope: trimValue(req.body.accessScope, ''),
      controlNotes: trimValue(req.body.controlNotes, '')
    };

    await user.save({ validateModifiedOnly: true });
    await logAuditEvent({
      actorUserId: user._id,
      targetUserId: user._id,
      actionType: 'user.admin_profile.updated',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user)
    });
    res.json({
      message: 'Admin profile updated',
      adminProfile: user.adminProfile,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to update admin profile');
  }
};

const applyForProviderRole = async (req, res) => {
  try {
    const { roleKey } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!PROVIDER_ROLE_KEYS.includes(roleKey)) {
      return res.status(400).json({ message: 'Unsupported provider role application' });
    }

    if (!canUseRole(getRoleAssignment(user, 'customer'))) {
      return res.status(403).json({ message: 'Only accounts with active user access can apply for provider roles' });
    }

    const roleAssignment = getRoleAssignment(user, roleKey);
    if (roleAssignment && canUseRole(roleAssignment)) {
      return res.status(400).json({ message: `Your ${roleKey} role is already approved` });
    }

    if (roleAssignment && ['suspended', 'deactivated'].includes(roleAssignment.roleStatus)) {
      return res.status(403).json({ message: `Your ${roleKey} access is currently restricted. Contact an administrator for help.` });
    }

    if (getLatestPendingProviderApplication(user, roleKey)) {
      return res.status(400).json({ message: `A ${roleKey} application is already pending review` });
    }

    const applicationData = roleKey === 'driver'
      ? buildDriverProfilePayload(req.body, user.driverProfile)
      : buildStaffProfilePayload(req.body, user.staffProfile);
    const documentKeys = getProviderRequirementConfig(roleKey).documents.map(({ key }) => key);

    const validation = validateProviderApplicationData(roleKey, applicationData);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const nextApplicationData = {
      ...applicationData,
      documents: setDocumentCollectionStatus(applicationData.documents, documentKeys, { status: 'pending' })
    };

    if (roleKey === 'driver') {
      user.driverProfile = {
        ...getPlainObject(user.driverProfile),
        ...nextApplicationData
      };
    }

    if (roleKey === 'staff') {
      user.staffProfile = {
        ...getPlainObject(user.staffProfile),
        ...nextApplicationData
      };
    }

    if (!roleAssignment) {
      user.roles.push(buildRoleAssignment(roleKey, {
        roleStatus: 'pending',
        verificationStatus: 'pending',
        isPrimary: false
      }));
    } else {
      roleAssignment.roleStatus = 'pending';
      roleAssignment.verificationStatus = 'pending';
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    createProviderApplication(user, roleKey, nextApplicationData);
    syncUserRoles(user);
    appendNotification(user, {
      type: 'role',
      title: `${roleLabel(roleKey)} application submitted`,
      message: `Your ${roleKey} application was sent for admin review. We will notify you once it is reviewed.`,
      link: '/apply-roles'
    });
    await user.save();
    await logAuditEvent({
      actorUserId: user._id,
      targetUserId: user._id,
      actionType: 'user.provider_application.submitted',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user),
      reason: roleKey
    });

    await addNotificationToAdmins({
      type: 'role',
      title: 'Provider application submitted',
      message: `${user.fullName} submitted a ${roleKey} application for review.`,
      link: '/admin/pending-approvals'
    });

    res.json({
      message: `${roleKey} application submitted for admin review`,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to submit provider application');
  }
};

const withdrawProviderApplication = async (req, res) => {
  try {
    const { roleKey } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!PROVIDER_ROLE_KEYS.includes(roleKey)) {
      return res.status(400).json({ message: 'Unsupported provider role application' });
    }

    const application = getLatestPendingProviderApplication(user, roleKey);
    if (!application || application.status !== 'pending') {
      return res.status(404).json({ message: 'No pending application found for this role' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    application.status = 'withdrawn';
    application.reviewedAt = null;
    application.reviewedBy = null;
    application.rejectionReason = '';

    user.roles = (user.roles || []).filter((role) => {
      if (role.roleKey !== roleKey) {
        return true;
      }

      return canUseRole(role);
    });

    syncUserRoles(user);
    appendNotification(user, {
      type: 'role',
      title: 'Application withdrawn',
      message: `Your ${roleKey} application has been withdrawn.`,
      link: '/apply-roles'
    });
    await user.save();
    await logAuditEvent({
      actorUserId: user._id,
      targetUserId: user._id,
      actionType: 'user.provider_application.withdrawn',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user),
      reason: roleKey
    });

    await addNotificationToAdmins({
      type: 'role',
      title: 'Provider application withdrawn',
      message: `${user.fullName} withdrew a pending ${roleKey} application.`,
      link: '/admin/pending-approvals'
    });

    res.json({
      message: `${roleKey} application withdrawn`,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to withdraw provider application');
  }
};

const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notifications = [...(user.notifications || [])]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .map(serializeNotification);

    res.json({
      notifications,
      unreadCount: getUnreadNotificationCount(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to load notifications');
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notification = (user.notifications || []).id(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await user.save({ validateModifiedOnly: true });

    const notifications = [...(user.notifications || [])]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .map(serializeNotification);

    res.json({
      notifications,
      unreadCount: getUnreadNotificationCount(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to update notification');
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    (user.notifications || []).forEach((notification) => {
      notification.isRead = true;
      notification.readAt = notification.readAt || new Date();
    });

    await user.save({ validateModifiedOnly: true });

    const notifications = [...(user.notifications || [])]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .map(serializeNotification);

    res.json({
      notifications,
      unreadCount: 0
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to update notifications');
  }
};

module.exports = {
  getProfile,
  getMyRoleHistory,
  updateProfile,
  updateDriverProfile,
  updateStaffProfile,
  updateAdminProfile,
  applyForProviderRole,
  withdrawProviderApplication,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
