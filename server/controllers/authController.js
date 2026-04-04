const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendServerError } = require('../utils/errorResponses');
const { logAuditEvent } = require('../utils/auditHelpers');
const {
  buildRoleAssignment,
  canUseRole,
  getRoleAssignment,
  getUsableRoleAssignments,
  serializeUser,
  syncUserRoles
} = require('../utils/roleHelpers');
const { validatePasswordStrength } = require('../utils/profileHelpers');

const register = async (req, res) => {
  try {
    const { fullName, email, password, username, phone, address, city } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username || normalizedEmail).trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'A user already exists with that email or username' });
    }

    const user = await User.create({
      username: normalizedUsername,
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      password,
      phone: phone || '',
      address: address || '',
      city: city || '',
      role: 'customer',
      accountStatus: 'pending',
      verificationStatus: 'pending',
      roles: [buildRoleAssignment('customer', { isPrimary: true })]
    });

    res.status(201).json({
      message: 'Registration submitted. Wait for admin approval before signing in.'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A user already exists with that email or username' });
    }

    sendServerError(res, error, 'Registration failed');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const identifier = String(email || '').trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        message: user.accountStatus === 'pending'
          ? 'Your account is pending admin approval'
          : 'Your account is not active'
      });
    }

    syncUserRoles(user);

    if (!getUsableRoleAssignments(user).length) {
      return res.status(403).json({ message: 'No active role is available for this account' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      ...serializeUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    sendServerError(res, error, 'Login failed');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    syncUserRoles(user);
    res.json(serializeUser(user));
  } catch (error) {
    sendServerError(res, error, 'Failed to load current user');
  }
};

const switchRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roleAssignment = getRoleAssignment(user, role);
    if (!roleAssignment) {
      return res.status(400).json({ message: 'Role not assigned to your account' });
    }

    if (!canUseRole(roleAssignment)) {
      return res.status(400).json({ message: 'Selected role is not active and verified yet' });
    }

    const previousRole = user.role;
    user.role = role;
    syncUserRoles(user);
    await user.save({ validateModifiedOnly: true });

    await logAuditEvent({
      actorUserId: user._id,
      targetUserId: user._id,
      actionType: 'user.active_role.switched',
      beforeSnapshot: { activeRole: previousRole },
      afterSnapshot: { activeRole: user.role }
    });

    res.json({
      ...serializeUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to switch role');
  }
};

module.exports = { register, login, getMe, switchRole };
