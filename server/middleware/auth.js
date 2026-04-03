const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  canUseRole,
  getRoleAssignment,
  getUsableRoleAssignments,
  hasPermission,
  syncUserRoles
} = require('../utils/roleHelpers');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (['suspended', 'deactivated'].includes(user.accountStatus)) {
        return res.status(403).json({ message: 'Your account is not active' });
      }

      syncUserRoles(user);

      if (!getUsableRoleAssignments(user).length) {
        return res.status(403).json({ message: 'No active role is available for this account' });
      }

      req.user = user;
      return next();
    } catch {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

const authorize = (...roles) => (req, res, next) => {
  const currentRole = getRoleAssignment(req.user, req.user.role);

  if (!roles.includes(req.user.role) || !canUseRole(currentRole)) {
    return res.status(403).json({ message: 'Not authorized for this action' });
  }

  next();
};

const authorizePermissions = (...permissions) => (req, res, next) => {
  const missingPermission = permissions.find((permission) => !hasPermission(req.user, permission));

  if (missingPermission) {
    return res.status(403).json({ message: `Missing permission: ${missingPermission}` });
  }

  next();
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

module.exports = { protect, authorize, authorizePermissions, generateToken };


