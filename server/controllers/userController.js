const User = require('../models/User');
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

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(serializeUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    user.fullName = req.body.fullName?.trim() || user.fullName;
    user.email = normalizedEmail;
    user.username = normalizedUsername;
    user.phone = req.body.phone || '';
    user.address = req.body.address || '';
    user.city = req.body.city || '';
    user.dob = req.body.dob || '';
    user.bio = req.body.bio || '';

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

    res.status(500).json({ message: error.message });
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
      preferences: req.body.preferences || '',
      notes: req.body.notes || ''
    };

    await user.save({ validateModifiedOnly: true });
    res.json({
      message: 'Customer profile updated',
      customerProfile: user.customerProfile,
      user: serializeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      ...user.driverProfile,
      drivingLicenseNumber: req.body.drivingLicenseNumber || '',
      licenseExpiryDate: req.body.licenseExpiryDate || null,
      nicId: req.body.nicId || '',
      serviceArea: req.body.serviceArea || '',
      providerDetails: req.body.providerDetails || ''
    };

    const pendingApplication = getLatestProviderApplication(user, 'driver');
    if (pendingApplication?.status === 'pending') {
      const driverProfileData = user.driverProfile?.toObject ? user.driverProfile.toObject() : user.driverProfile;
      pendingApplication.applicationData = {
        ...pendingApplication.applicationData,
        ...driverProfileData
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
    res.status(500).json({ message: error.message });
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
      ...user.staffProfile,
      storeName: req.body.storeName || '',
      storeOwner: req.body.storeOwner || '',
      businessRegistrationNumber: req.body.businessRegistrationNumber || '',
      storeAddress: req.body.storeAddress || '',
      storeContactNumber: req.body.storeContactNumber || '',
      storeEmail: req.body.storeEmail || ''
    };

    const pendingApplication = getLatestProviderApplication(user, 'staff');
    if (pendingApplication?.status === 'pending') {
      const staffProfileData = user.staffProfile?.toObject ? user.staffProfile.toObject() : user.staffProfile;
      pendingApplication.applicationData = {
        ...pendingApplication.applicationData,
        ...staffProfileData
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
    res.status(500).json({ message: error.message });
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
      accessScope: req.body.accessScope || '',
      controlNotes: req.body.controlNotes || ''
    };

    await user.save({ validateModifiedOnly: true });
    res.json({
      message: 'Admin profile updated',
      adminProfile: user.adminProfile,
      user: serializeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(403).json({ message: 'Only customers can apply for provider roles' });
    }

    const roleAssignment = getRoleAssignment(user, roleKey);
    if (roleAssignment && ['active', 'verified'].includes(roleAssignment.roleStatus) && roleAssignment.verificationStatus === 'verified') {
      return res.status(400).json({ message: `Your ${roleKey} role is already approved` });
    }

    const applicationData = roleKey === 'driver'
      ? {
          drivingLicenseNumber: req.body.drivingLicenseNumber || '',
          licenseExpiryDate: req.body.licenseExpiryDate || null,
          nicId: req.body.nicId || '',
          serviceArea: req.body.serviceArea || '',
          providerDetails: req.body.providerDetails || ''
        }
      : {
          storeName: req.body.storeName || '',
          storeOwner: req.body.storeOwner || '',
          businessRegistrationNumber: req.body.businessRegistrationNumber || '',
          storeAddress: req.body.storeAddress || '',
          storeContactNumber: req.body.storeContactNumber || '',
          storeEmail: req.body.storeEmail || ''
        };

    const requiredFields = roleKey === 'driver'
      ? ['drivingLicenseNumber', 'nicId', 'serviceArea']
      : ['storeName', 'businessRegistrationNumber', 'storeAddress', 'storeContactNumber', 'storeEmail'];

    const missingField = requiredFields.find((field) => !applicationData[field]);
    if (missingField) {
      return res.status(400).json({ message: `Missing required field: ${missingField}` });
    }

    if (roleKey === 'driver') {
      user.driverProfile = {
        ...user.driverProfile,
        ...applicationData
      };
    }

    if (roleKey === 'staff') {
      user.staffProfile = {
        ...user.staffProfile,
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
    await user.save();

    res.json({
      message: `${roleKey} application submitted for admin review`,
      user: serializeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateCustomerProfile,
  updateDriverProfile,
  updateStaffProfile,
  updateAdminProfile,
  applyForProviderRole
};
