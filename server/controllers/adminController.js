const User = require('../models/User');
const { sendServerError } = require('../utils/errorResponses');
const { addNotificationToUser, appendNotification } = require('../utils/notificationHelpers');
const { buildUserAuditSnapshot, logAuditEvent } = require('../utils/auditHelpers');
const {
  ACCOUNT_STATUSES,
  ROLE_STATUSES,
  VERIFICATION_STATUSES,
  buildRoleAssignment,
  canUseRole,
  getLatestProviderApplication,
  getPrimaryRole,
  getRoleAssignment,
  normalizeRoleAssignment,
  serializeUser,
  syncUserRoles,
  validateManagedUserState
} = require('../utils/roleHelpers');
const { trimValue } = require('../utils/profileHelpers');

const MANAGEABLE_ROLE_KEYS = ['customer', 'driver', 'staff'];

const roleLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const toPlain = (value) => (value?.toObject ? value.toObject() : value);
const snapshotsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

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

const buildManageableRoles = (incomingRoles = []) => {
  const nextRoles = [];

  incomingRoles.forEach((role) => {
    if (!MANAGEABLE_ROLE_KEYS.includes(role.roleKey)) {
      return;
    }

    const normalizedRole = normalizeRoleAssignment(role);
    if (!normalizedRole || nextRoles.some((item) => item.roleKey === normalizedRole.roleKey)) {
      return;
    }

    nextRoles.push(normalizedRole);
  });

  if (!nextRoles.some((role) => role.roleKey === 'customer')) {
    nextRoles.unshift(buildRoleAssignment('customer', { isPrimary: true }));
  }

  return nextRoles;
};

const buildIdentitySnapshot = (user) => ({
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  driverProfile: {
    nicId: user.driverProfile?.nicId || ''
  }
});

const buildRoleSnapshot = (user) => ({
  accountStatus: user.accountStatus,
  activeRole: user.role,
  primaryRole: getPrimaryRole(user),
  roles: (user.roles || []).map((role) => ({
    roleKey: role.roleKey,
    roleStatus: role.roleStatus,
    verificationStatus: role.verificationStatus,
    isPrimary: Boolean(role.isPrimary)
  }))
});

const buildRoleChangeMessage = (user) => {
  const roleList = (user.roles || []).map((role) => roleLabel(role.roleKey)).join(', ');
  return `An administrator updated your role access. Current roles: ${roleList}.`;
};

const syncProviderApplicationsFromRoles = (user, actorUserId) => {
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
      latestApplication.reviewedBy = latestApplication.reviewedBy || actorUserId;
      latestApplication.rejectionReason = '';
      return;
    }

    if (role.roleStatus === 'rejected' || role.verificationStatus === 'rejected') {
      latestApplication.status = 'rejected';
      latestApplication.reviewedAt = new Date();
      latestApplication.reviewedBy = actorUserId;
    }
  });
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('providerApplications.reviewedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(users.map(serializeUser));
  } catch (error) {
    sendServerError(res, error, 'Failed to load users');
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

    const beforeSnapshot = buildUserAuditSnapshot(user);
    const beforeIdentitySnapshot = buildIdentitySnapshot(user);
    const beforeRoleSnapshot = buildRoleSnapshot(user);
    const previousAccountStatus = user.accountStatus;

    const nextEmail = req.body.email || user.email;
    const nextUsername = req.body.username || user.username || nextEmail;
    const { normalizedEmail, normalizedUsername } = await ensureUniqueIdentityFields(
      user._id,
      nextEmail,
      nextUsername
    );

    user.fullName = trimValue(req.body.fullName, user.fullName);
    user.email = normalizedEmail;
    user.username = normalizedUsername;

    if (req.body.driverProfile && typeof req.body.driverProfile === 'object') {
      const currentDriverProfile = toPlain(user.driverProfile) || {};
      user.driverProfile = {
        ...currentDriverProfile,
        nicId: trimValue(req.body.driverProfile.nicId, currentDriverProfile.nicId || '')
      };
    }

    if (req.body.accountStatus) {
      if (!ACCOUNT_STATUSES.includes(req.body.accountStatus)) {
        return res.status(400).json({ message: 'Invalid account status' });
      }

      user.accountStatus = req.body.accountStatus;
      user.deactivatedAt = req.body.accountStatus === 'deactivated' ? (user.deactivatedAt || new Date()) : null;
    }

    if (Array.isArray(req.body.roles)) {
      user.roles = buildManageableRoles(req.body.roles);
    }

    const nextPrimaryRole = trimValue(req.body.primaryRole, getPrimaryRole(user));
    const nextActiveRole = trimValue(req.body.activeRole, user.role);
    const validation = validateManagedUserState({
      accountStatus: user.accountStatus,
      roles: user.roles,
      activeRole: nextActiveRole,
      primaryRole: nextPrimaryRole
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    user.roles = (user.roles || []).map((role) => ({
      ...toPlain(role),
      isPrimary: role.roleKey === nextPrimaryRole
    }));
    user.role = nextActiveRole;

    syncProviderApplicationsFromRoles(user, req.user._id);

    const afterIdentityPreview = buildIdentitySnapshot(user);
    const afterRolePreview = buildRoleSnapshot({
      ...toPlain(user),
      role: user.role,
      roles: user.roles
    });

    const accountStatusChanged = previousAccountStatus !== user.accountStatus;
    const identityChanged = !snapshotsEqual(beforeIdentitySnapshot, afterIdentityPreview);
    const rolesChanged = !snapshotsEqual(beforeRoleSnapshot, afterRolePreview);

    if (accountStatusChanged) {
      appendNotification(user, {
        type: 'admin',
        title: user.accountStatus === 'active' ? 'Account reactivated' : 'Account deactivated',
        message: user.accountStatus === 'active'
          ? 'An administrator restored access to your account.'
          : 'An administrator deactivated your account. Contact support if you need access restored.',
        link: '/signin'
      });
    }

    if (rolesChanged) {
      appendNotification(user, {
        type: 'role',
        title: 'Role access updated',
        message: buildRoleChangeMessage(user),
        link: '/switch-roles'
      });
    }

    syncUserRoles(user);
    await user.save();

    const afterSnapshot = buildUserAuditSnapshot(user);
    const auditEvents = [];

    if (identityChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'user.profile.updated',
        beforeSnapshot: beforeIdentitySnapshot,
        afterSnapshot: buildIdentitySnapshot(user)
      }));
    }

    if (rolesChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'user.roles.updated',
        beforeSnapshot: beforeRoleSnapshot,
        afterSnapshot: buildRoleSnapshot(user)
      }));
    }

    if (accountStatusChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'user.account_status.updated',
        beforeSnapshot,
        afterSnapshot
      }));
    }

    await Promise.all(auditEvents);

    await addNotificationToUser(req.user._id, {
      type: 'admin',
      title: 'User record updated',
      message: `You updated ${user.fullName}'s account settings.`,
      link: '/admin/users'
    });

    res.json(serializeUser(user));
  } catch (error) {
    if (error.code === 11000 || error.message === 'Email or username is already in use') {
      return res.status(400).json({ message: 'Email or username is already in use' });
    }

    sendServerError(res, error, 'Failed to update user');
  }
};

const reviewProviderApplication = async (req, res) => {
  try {
    const { id, roleKey } = req.params;
    const { action, rejectionReason = '' } = req.body;
    const actionLabel = action === 'approve' ? 'approved' : 'rejected';

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

    const beforeSnapshot = buildUserAuditSnapshot(user);
    let roleAssignment = getRoleAssignment(user, roleKey);
    if (!roleAssignment) {
      roleAssignment = buildRoleAssignment(roleKey, {
        roleStatus: 'pending',
        verificationStatus: 'pending',
        isPrimary: false
      });
      user.roles.push(roleAssignment);
    }

    const trimmedReason = trimValue(rejectionReason, '');

    if (action === 'approve') {
      application.status = 'approved';
      application.reviewedAt = new Date();
      application.reviewedBy = req.user._id;
      application.rejectionReason = '';
      roleAssignment.roleStatus = 'active';
      roleAssignment.verificationStatus = 'verified';
      appendNotification(user, {
        type: 'role',
        title: `${roleLabel(roleKey)} application approved`,
        message: `Your ${roleKey} role is now active and ready to use.`,
        link: '/switch-roles'
      });
    }

    if (action === 'reject') {
      application.status = 'rejected';
      application.reviewedAt = new Date();
      application.reviewedBy = req.user._id;
      application.rejectionReason = trimmedReason;
      roleAssignment.roleStatus = 'rejected';
      roleAssignment.verificationStatus = 'rejected';
      appendNotification(user, {
        type: 'role',
        title: `${roleLabel(roleKey)} application rejected`,
        message: trimmedReason
          ? `Your ${roleKey} application was rejected: ${trimmedReason}`
          : `Your ${roleKey} application was rejected by admin.`,
        link: '/apply-roles'
      });
    }

    syncUserRoles(user);
    await user.save();

    await logAuditEvent({
      actorUserId: req.user._id,
      targetUserId: user._id,
      actionType: `provider_application.${action === 'approve' ? 'approved' : 'rejected'}`,
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user),
      reason: trimmedReason
    });

    await addNotificationToUser(req.user._id, {
      type: 'admin',
      title: 'Application reviewed',
      message: `You ${actionLabel} the ${roleKey} application for ${user.fullName}.`,
      link: '/admin/pending-approvals'
    });

    res.json({
      message: `${roleKey} application ${actionLabel}`,
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to review provider application');
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own admin account' });
    }

    if (getRoleAssignment(user, 'admin')) {
      return res.status(403).json({ message: 'Seeded admin accounts cannot be deactivated through this workflow' });
    }

    if (user.accountStatus === 'deactivated') {
      return res.status(400).json({ message: 'This account is already deactivated' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);

    user.accountStatus = 'deactivated';
    user.deactivatedAt = new Date();
    appendNotification(user, {
      type: 'admin',
      title: 'Account deactivated',
      message: 'An administrator deactivated your account. Contact support if you need access restored.',
      link: '/signin'
    });

    syncUserRoles(user);
    await user.save();

    await logAuditEvent({
      actorUserId: req.user._id,
      targetUserId: user._id,
      actionType: 'user.account.deactivated',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user)
    });

    await addNotificationToUser(req.user._id, {
      type: 'admin',
      title: 'Account deactivated',
      message: `You deactivated ${user.fullName}'s account.`,
      link: '/admin/users'
    });

    res.json({
      message: 'Account deactivated',
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to deactivate user');
  }
};

module.exports = { getAllUsers, updateUser, reviewProviderApplication, deleteUser };
