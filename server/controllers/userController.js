const User = require('../models/User');
const { sendServerError } = require('../utils/errorResponses');
const {
  addNotificationToAdmins,
  appendNotification,
  getUnreadNotificationCount,
  serializeNotification
} = require('../utils/notificationHelpers');
const {
  PROVIDER_ROLE_KEYS,
  buildRoleAssignment,
  canManageRoleProfile,
  canUseRole,
  getLatestProviderApplication,
  getRoleAssignment,
  serializeUser,
  syncUserRoles,
  upsertProviderApplication
} = require('../utils/roleHelpers');
const {
  mergeDriverDocuments,
  mergeStaffDocuments,
  normalizeEmergencyContact,
  normalizePreferredLanguage,
  parseDate,
  trimValue
} = require('../utils/profileHelpers');

const roleLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);

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

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(serializeUser(user));
  } catch (error) {
    sendServerError(res, error, 'Failed to load profile');
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
    const { normalizedEmail, normalizedUsername } = await ensureUniqueIdentityFields(
      user._id,
      nextEmail,
      nextUsername
    );

    if (req.body.password && String(req.body.password).length < 5) {
      return res.status(400).json({ message: 'Password must be at least 5 characters long' });
    }

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

    res.json(serializeUser(user));
  } catch (error) {
    if (error.code === 11000 || error.message === 'Email or username is already in use') {
      return res.status(400).json({ message: 'Email or username is already in use' });
    }

    sendServerError(res, error, 'Failed to update profile');
  }
};

const updateCustomerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!canUseRole(getRoleAssignment(user, 'customer'))) {
      return res.status(403).json({ message: 'Customer profile access is restricted to active customer roles' });
    }

    user.customerProfile = {
      ...user.customerProfile,
      preferences: trimValue(req.body.preferences, ''),
      notes: trimValue(req.body.notes, '')
    };

    await user.save({ validateModifiedOnly: true });
    res.json({
      message: 'Customer profile updated',
      customerProfile: user.customerProfile,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to update customer profile');
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

    user.driverProfile = {
      ...getPlainObject(user.driverProfile),
      ...buildDriverProfilePayload(req.body, user.driverProfile)
    };

    const pendingApplication = getLatestProviderApplication(user, 'driver');
    if (pendingApplication?.status === 'pending') {
      pendingApplication.applicationData = {
        ...pendingApplication.applicationData,
        ...getPlainObject(user.driverProfile)
      };
      pendingApplication.submittedAt = new Date();
    }

    await user.save({ validateModifiedOnly: true });
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
      return res.status(403).json({ message: 'Staff onboarding is available only for assigned staff applicants or roles' });
    }

    user.staffProfile = {
      ...getPlainObject(user.staffProfile),
      ...buildStaffProfilePayload(req.body, user.staffProfile)
    };

    const pendingApplication = getLatestProviderApplication(user, 'staff');
    if (pendingApplication?.status === 'pending') {
      pendingApplication.applicationData = {
        ...pendingApplication.applicationData,
        ...getPlainObject(user.staffProfile)
      };
      pendingApplication.submittedAt = new Date();
    }

    await user.save({ validateModifiedOnly: true });
    res.json({
      message: 'Staff profile updated',
      staffProfile: user.staffProfile,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to update staff profile');
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

    user.adminProfile = {
      ...user.adminProfile,
      accessScope: trimValue(req.body.accessScope, ''),
      controlNotes: trimValue(req.body.controlNotes, '')
    };

    await user.save({ validateModifiedOnly: true });
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
      return res.status(403).json({ message: 'Only accounts with active customer access can apply for provider roles' });
    }

    const roleAssignment = getRoleAssignment(user, roleKey);
    if (roleAssignment && canUseRole(roleAssignment)) {
      return res.status(400).json({ message: `Your ${roleKey} role is already approved` });
    }

    const applicationData = roleKey === 'driver'
      ? buildDriverProfilePayload(req.body, user.driverProfile)
      : buildStaffProfilePayload(req.body, user.staffProfile);

    const requiredFields = roleKey === 'driver'
      ? ['drivingLicenseNumber', 'nicId', 'serviceArea']
      : ['storeName', 'businessRegistrationNumber', 'storeAddress', 'storeContactNumber', 'storeEmail'];

    const missingField = requiredFields.find((field) => !applicationData[field]);
    if (missingField) {
      return res.status(400).json({ message: `Missing required field: ${missingField}` });
    }

    if (roleKey === 'driver') {
      user.driverProfile = {
        ...getPlainObject(user.driverProfile),
        ...applicationData
      };
    }

    if (roleKey === 'staff') {
      user.staffProfile = {
        ...getPlainObject(user.staffProfile),
        ...applicationData
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

    upsertProviderApplication(user, roleKey, applicationData);
    syncUserRoles(user);
    appendNotification(user, {
      type: 'role',
      title: `${roleLabel(roleKey)} application submitted`,
      message: `Your ${roleKey} application was sent for admin review. We will notify you once it is reviewed.`,
      link: '/apply-roles'
    });
    await user.save();

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

    const application = getLatestProviderApplication(user, roleKey);
    if (!application || application.status !== 'pending') {
      return res.status(404).json({ message: 'No pending application found for this role' });
    }

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
  updateProfile,
  updateCustomerProfile,
  updateDriverProfile,
  updateStaffProfile,
  updateAdminProfile,
  applyForProviderRole,
  withdrawProviderApplication,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
