const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const {
  buildRoleAssignment,
  canUseRole,
  getRoleAssignment,
  getUsableRoleAssignments,
  serializeUser,
  syncUserRoles
} = require('../utils/roleHelpers');

const register = async (req, res) => {
  try {
    const { fullName, email, password, username, phone, address, city } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
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
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [buildRoleAssignment('customer', { isPrimary: true })],
      customerProfile: {
        preferences: '',
        notes: ''
      }
    });

    res.status(201).json({
      ...serializeUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A user already exists with that email or username' });
    }

    res.status(500).json({ message: error.message });
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

    if (['suspended', 'deactivated'].includes(user.accountStatus)) {
      return res.status(403).json({ message: 'Your account is not active' });
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
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
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

const switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roleAssignment = getRoleAssignment(user, role);
    if (!roleAssignment) {
      return res.status(400).json({ message: 'Role not assigned to your account' });
    }

    if (!canUseRole(roleAssignment)) {
      return res.status(400).json({ message: 'Selected role is not active for use yet' });
    }

    user.role = role;
    syncUserRoles(user);
    await user.save({ validateModifiedOnly: true });

    res.json({
      ...serializeUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe, switchRole };
