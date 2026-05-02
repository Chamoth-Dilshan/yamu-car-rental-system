const User = require('../users/user.model');
const { generateToken } = require('../../middleware/auth.middleware');
const { sendServerError } = require('../../utils/errorResponses');
const { logAuditEvent } = require('../../utils/auditHelpers');
const { verifyGoogleIdToken } = require('./googleAuth.service');
const {
  generatePlaceholderPassword,
  generateUniqueUsername,
  getInactiveAccountMessage
} = require('./auth.service');
const {
  buildRoleAssignment,
  canUseRole,
  getRoleAssignment,
  getUsableRoleAssignments,
  serializeUser,
  syncUserRoles
} = require('../../utils/roleHelpers');
const { validatePasswordStrength } = require('../../utils/profileHelpers');

const buildActiveCustomerRole = () => buildRoleAssignment('customer', {
  roleStatus: 'active',
  verificationStatus: 'verified',
  isPrimary: true
});

const hasProfileImage = (value) => Boolean(value && value !== 'avatar.png');

const applyGoogleProfileImage = (user, picture) => {
  if (!picture) {
    return;
  }

  if (!user.avatar) {
    user.avatar = picture;
  }

  if (!hasProfileImage(user.profilePic)) {
    user.profilePic = picture;
  }
};

const sendInactiveAccountResponse = (res, accountStatus) => res.status(403).json({
  message: getInactiveAccountMessage(accountStatus)
});

const respondWithAuthSession = async (res, user) => {
  syncUserRoles(user);

  if (!getUsableRoleAssignments(user).length) {
    return res.status(403).json({ message: 'No active role is available for this account' });
  }

  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });

  return res.json({
    ...serializeUser(user),
    token: generateToken(user._id)
  });
};

const register = async (req, res) => {
  try {
    const { fullName, email, password, username, phone, address, city } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: 'Full name, username, email, and password are required' });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim().toLowerCase();

    if (!normalizedUsername) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const [existingUsername, existingEmail] = await Promise.all([
      User.findOne({ username: normalizedUsername }).select('_id'),
      User.findOne({ email: normalizedEmail }).select('_id')
    ]);

    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already in use' });
    }

    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    await User.create({
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
      roles: [buildActiveCustomerRole()]
    });

    res.status(201).json({
      message: 'Registration successful. You can now sign in.'
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.username) {
        return res.status(400).json({ message: 'Username is already in use' });
      }

      if (error.keyPattern?.email) {
        return res.status(400).json({ message: 'Email is already in use' });
      }

      return res.status(400).json({ message: 'Email or username is already in use' });
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
      return sendInactiveAccountResponse(res, user.accountStatus);
    }

    return respondWithAuthSession(res, user);
  } catch (error) {
    sendServerError(res, error, 'Login failed');
  }
};

const googleLogin = async (req, res) => {
  try {
    const credential = String(req.body.credential || req.body.idToken || '').trim();

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    let googleAccount;

    try {
      googleAccount = await verifyGoogleIdToken(credential);
    } catch (error) {
      return res.status(error.statusCode || 401).json({
        message: error.message || 'Invalid Google credential.'
      });
    }

    if (!googleAccount.email) {
      return res.status(400).json({ message: 'Google account email is required.' });
    }

    const userByGoogleId = await User.findOne({ googleId: googleAccount.googleId });

    if (userByGoogleId) {
      if (userByGoogleId.accountStatus !== 'active') {
        return sendInactiveAccountResponse(res, userByGoogleId.accountStatus);
      }

      return respondWithAuthSession(res, userByGoogleId);
    }

    const existingUser = await User.findOne({ email: googleAccount.email });

    if (existingUser) {
      if (existingUser.accountStatus !== 'active') {
        return sendInactiveAccountResponse(res, existingUser.accountStatus);
      }

      if (existingUser.googleId && existingUser.googleId !== googleAccount.googleId) {
        return res.status(409).json({ message: 'This email is already linked to a different Google account.' });
      }

      if (!existingUser.googleId) {
        existingUser.googleId = googleAccount.googleId;
      }

      if (!existingUser.authProvider) {
        existingUser.authProvider = existingUser.password ? 'local' : 'google';
      } else if (!existingUser.password) {
        existingUser.authProvider = 'google';
      }

      existingUser.emailVerified = true;
      applyGoogleProfileImage(existingUser, googleAccount.picture);

      return respondWithAuthSession(res, existingUser);
    }

    const fullName = googleAccount.fullName || googleAccount.email.split('@')[0] || 'Google User';
    const username = await generateUniqueUsername({
      email: googleAccount.email,
      fullName
    });

    const newUser = await User.create({
      username,
      fullName,
      email: googleAccount.email,
      password: generatePlaceholderPassword(),
      role: 'customer',
      accountStatus: 'active',
      verificationStatus: 'verified',
      authProvider: 'google',
      googleId: googleAccount.googleId,
      emailVerified: true,
      profilePic: googleAccount.picture || 'avatar.png',
      avatar: googleAccount.picture || '',
      roles: [buildActiveCustomerRole()]
    });

    return respondWithAuthSession(res, newUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Google account could not be linked to a unique user.' });
    }

    return sendServerError(res, error, 'Google login failed');
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

module.exports = { register, login, googleLogin, getMe, switchRole };
