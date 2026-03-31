const User = require('../models/User');
const {
  ACCOUNT_STATUSES,
  ROLE_KEYS,
  ROLE_STATUSES,
  VERIFICATION_STATUSES,
  buildRoleAssignment,
  canUseRole,
  getLatestProviderApplication,
  getPrimaryRole,
  getRoleAssignment,
  serializeUser,
  syncUserRoles
} = require('../utils/roleHelpers');

const MANAGEABLE_ROLE_KEYS = ['customer', 'driver', 'staff'];

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

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('providerApplications.reviewedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(users.map(serializeUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (getRoleAssignment(user, 'admin')) {
      return res.status(403).json({ message: 'Seeded admin accounts are not editable through this workflow' });
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

    if (req.body.accountStatus) {
      if (!ACCOUNT_STATUSES.includes(req.body.accountStatus)) {
        return res.status(400).json({ message: 'Invalid account status' });
      }

      user.accountStatus = req.body.accountStatus;
    }

    const incomingRoles = Array.isArray(req.body.roles) ? req.body.roles : null;
    if (incomingRoles) {
      const existingAdminRole = getRoleAssignment(user, 'admin');
      const nextRoles = [];

      incomingRoles.forEach((role) => {
        if (!MANAGEABLE_ROLE_KEYS.includes(role.roleKey)) {
          return;
        }

        nextRoles.push({
          roleKey: role.roleKey,
          roleStatus: ROLE_STATUSES.includes(role.roleStatus) ? role.roleStatus : 'active',
          verificationStatus: VERIFICATION_STATUSES.includes(role.verificationStatus)
            ? role.verificationStatus
            : 'verified',
          isPrimary: Boolean(role.isPrimary)
        });
      });

      if (!existingAdminRole) {
        if (!nextRoles.some((item) => item.roleKey === 'customer')) {
          nextRoles.unshift(buildRoleAssignment('customer', { isPrimary: true }));
        }
      }

      if (existingAdminRole) {
        nextRoles.push({
          roleKey: 'admin',
          roleStatus: existingAdminRole.roleStatus,
          verificationStatus: existingAdminRole.verificationStatus,
          isPrimary: incomingRoles.some((item) => item.roleKey === 'admin' && item.isPrimary)
        });
      }

      user.roles = nextRoles;
    }

    const nextPrimaryRole = ROLE_KEYS.includes(req.body.primaryRole) ? req.body.primaryRole : getPrimaryRole(user);
    if (nextPrimaryRole) {
      user.roles = user.roles.map((role) => {
        const roleData = role?.toObject ? role.toObject() : role;
        return {
          ...roleData,
          isPrimary: role.roleKey === nextPrimaryRole
        };
      });
    }

    if (req.body.activeRole && ROLE_KEYS.includes(req.body.activeRole)) {
      user.role = req.body.activeRole;
    }

    user.roles.forEach((role) => {
      if (!['driver', 'staff'].includes(role.roleKey)) {
        return;
      }

      const latestApplication = getLatestProviderApplication(user, role.roleKey);
      if (!latestApplication) {
        return;
      }

      if (canUseRole(role)) {
        latestApplication.status = 'approved';
        latestApplication.reviewedAt = latestApplication.reviewedAt || new Date();
        latestApplication.reviewedBy = latestApplication.reviewedBy || req.user._id;
        latestApplication.rejectionReason = '';
      }

      if (role.roleStatus === 'rejected' || role.verificationStatus === 'rejected') {
        latestApplication.status = 'rejected';
        latestApplication.reviewedAt = new Date();
        latestApplication.reviewedBy = req.user._id;
      }
    });

    syncUserRoles(user);
    await user.save();

    res.json(serializeUser(user));
  } catch (error) {
    if (error.code === 11000 || error.message === 'Email or username is already in use') {
      return res.status(400).json({ message: 'Email or username is already in use' });
    }

    res.status(500).json({ message: error.message });
  }
};

const reviewProviderApplication = async (req, res) => {
  try {
    const { id, roleKey } = req.params;
    const { action, rejectionReason = '' } = req.body;

    if (!['driver', 'staff'].includes(roleKey)) {
      return res.status(400).json({ message: 'Unsupported provider role' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid review action' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const application = getLatestProviderApplication(user, roleKey);
    if (!application || application.status !== 'pending') {
      return res.status(404).json({ message: 'No pending application found for this role' });
    }

    let roleAssignment = getRoleAssignment(user, roleKey);
    if (!roleAssignment) {
      roleAssignment = buildRoleAssignment(roleKey, {
        roleStatus: 'pending',
        verificationStatus: 'pending',
        isPrimary: false
      });
      user.roles.push(roleAssignment);
    }

    if (action === 'approve') {
      application.status = 'approved';
      application.reviewedAt = new Date();
      application.reviewedBy = req.user._id;
      application.rejectionReason = '';
      roleAssignment.roleStatus = 'active';
      roleAssignment.verificationStatus = 'verified';
    }

    if (action === 'reject') {
      application.status = 'rejected';
      application.reviewedAt = new Date();
      application.reviewedBy = req.user._id;
      application.rejectionReason = rejectionReason;
      roleAssignment.roleStatus = 'rejected';
      roleAssignment.verificationStatus = 'rejected';
    }

    syncUserRoles(user);
    await user.save();

    res.json({
      message: `${roleKey} application ${action}d`,
      user: serializeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    if (getRoleAssignment(user, 'admin')) {
      return res.status(403).json({ message: 'Seeded admin accounts cannot be deleted through this workflow' });
    }

    await user.deleteOne();

    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllUsers, updateUser, reviewProviderApplication, deleteUser };
