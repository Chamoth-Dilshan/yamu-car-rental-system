const User = require('../users/user.model');
const { sendServerError } = require('../../utils/errorResponses');
const { sendProtectedUpload } = require('../../utils/fileHelpers');
const { addNotificationToUser, appendNotification } = require('../../utils/notificationHelpers');
const { buildUserAuditSnapshot, logAuditEvent, getRoleHistoryTimeline } = require('../../utils/auditHelpers');
const {
  ACCOUNT_STATUSES,
  ROLE_KEYS,
  buildRoleAssignment,
  canUseRole,
  getLatestApprovedProviderApplication,
  getLatestPendingProviderApplication,
  getPrimaryRole,
  getProviderRequirementConfig,
  getRoleAssignment,
  normalizeRoleAssignment,
  serializeUser,
  syncUserRoles,
  validateManagedUserState
} = require('../../utils/roleHelpers');
const {
  hasDocumentFile,
  normalizeDriverDocuments,
  normalizeStaffDocuments,
  setDocumentCollectionStatus,
  trimValue,
  validateEmailAddress,
  validateRequiredTextFields,
  validateUsernameValue
} = require('../../utils/profileHelpers');

const MANAGEABLE_ROLE_KEYS = [...ROLE_KEYS];

const roleLabel = (value) => ({
  customer: 'User',
  staff: 'Store',
  driver: 'Driver',
  admin: 'Admin'
}[value] || value.charAt(0).toUpperCase() + value.slice(1));
const toPlain = (value) => (value?.toObject ? value.toObject() : value);
const snapshotsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isProtectedAdminAccount = (user) => Boolean(user?.isSystemAdmin);
const ensureUniqueIdentityFields = async (userId, email, username) => {
  const emailValidation = validateEmailAddress(email);
  if (emailValidation.error) {
    throw new Error(emailValidation.error);
  }

  const usernameValidation = validateUsernameValue(username);
  if (usernameValidation.error) {
    throw new Error(usernameValidation.error);
  }

  const existing = await User.findOne({
    _id: { $ne: userId },
    $or: [{ email: emailValidation.value }, { username: usernameValidation.value }]
  });

  if (existing) {
    throw new Error('Email or username is already in use');
  }

  return {
    normalizedEmail: emailValidation.value,
    normalizedUsername: usernameValidation.value
  };
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

const validateProviderRoleAssignmentChange = (user, nextRoles = [], currentRoles = []) => {
  for (const roleKey of ['driver', 'staff']) {
    const nextRole = nextRoles.find((role) => role.roleKey === roleKey);
    if (!nextRole) {
      continue;
    }

    const currentRole = currentRoles.find((role) => role.roleKey === roleKey);
    const latestPendingApplication = getLatestPendingProviderApplication(user, roleKey);
    const latestApprovedApplication = getLatestApprovedProviderApplication(user, roleKey);
    const roleBecameUsable = canUseRole(nextRole) && !canUseRole(currentRole);
    const roleStateChangedWhilePending = latestPendingApplication
      && (
        !currentRole
        || currentRole.roleStatus !== nextRole.roleStatus
        || currentRole.verificationStatus !== nextRole.verificationStatus
      );

    if (roleStateChangedWhilePending) {
      return {
        valid: false,
        message: `Use the provider review workflow to approve or reject the pending ${roleKey} application`
      };
    }

    if (roleBecameUsable && !latestApprovedApplication) {
      return {
        valid: false,
        message: `${roleKey} cannot become active until an approved application exists`
      };
    }
  }

  return { valid: true };
};

const buildProviderApplicationAssessment = (roleKey, applicationData = {}, user = {}) => {
  const config = getProviderRequirementConfig(roleKey);
  const checks = [
    {
      key: 'accountStatus',
      label: 'Account is active',
      complete: user.accountStatus === 'active',
      blocking: true
    },
    ...config.fields.map(({ key, label }) => ({
      key,
      label,
      complete: Boolean(trimValue(applicationData[key], '')),
      blocking: true
    })),
    ...config.documents.map(({ key, label }) => ({
      key,
      label,
      complete: hasDocumentFile(applicationData?.documents?.[key] || {}),
      blocking: true
    }))
  ];
  const missingItems = checks.filter((item) => item.blocking && !item.complete).map((item) => item.label);

  return {
    checks,
    missingItems,
    valid: missingItems.length === 0
  };
};

const validateProviderApplicationSnapshot = (roleKey, applicationData = {}, user = {}) => {
  const assessment = buildProviderApplicationAssessment(roleKey, applicationData, user);

  if (!assessment.valid) {
    return {
      valid: false,
      message: `Cannot approve ${roleKey} application. Missing required items: ${assessment.missingItems.join(', ')}`,
      missingItems: assessment.missingItems
    };
  }

  return {
    valid: true,
    assessment
  };
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

const buildAssignedRolesSnapshot = (user) => (
  (user.roles || []).map((role) => ({
    roleKey: role.roleKey,
    roleStatus: role.roleStatus,
    verificationStatus: role.verificationStatus,
    isPrimary: Boolean(role.isPrimary)
  }))
);

const buildRoleChangeMessage = (user) => {
  const roleList = (user.roles || []).map((role) => roleLabel(role.roleKey)).join(', ');
  return `An administrator updated your role access. Current roles: ${roleList}.`;
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

const getUserRoleHistory = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('_id');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const items = await getRoleHistoryTimeline(user._id, limit);

    res.json({ items });
  } catch (error) {
    sendServerError(res, error, 'Failed to load role history');
  }
};

const getUserProviderDocument = async (req, res) => {
  try {
    const { id, roleKey, documentKey } = req.params;

    if (!['driver', 'staff'].includes(roleKey)) {
      return res.status(400).json({ message: 'Unsupported provider role' });
    }

    const documentKeys = getProviderRequirementConfig(roleKey).documents.map(({ key }) => key);
    if (!documentKeys.includes(documentKey)) {
      return res.status(400).json({ message: 'Unsupported provider document' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pendingApplication = getLatestPendingProviderApplication(user, roleKey);
    const pendingApplicationDocument = pendingApplication?.applicationData?.documents?.[documentKey];
    const profile = roleKey === 'driver' ? user.driverProfile : user.staffProfile;
    const profileDocument = profile?.documents?.[documentKey];
    const document = pendingApplicationDocument?.filePath ? pendingApplicationDocument : profileDocument;

    if (!document?.filePath) {
      return res.status(404).json({ message: 'Document not found' });
    }

    return sendProtectedUpload(res, document);
  } catch (error) {
    return sendServerError(res, error, 'Failed to load provider document');
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isProtectedAdminAccount(user)) {
      return res.status(403).json({ message: 'Protected admin accounts are not editable through this workflow' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    const beforeIdentitySnapshot = buildIdentitySnapshot(user);
    const beforeRoleSnapshot = buildRoleSnapshot(user);
    const previousAccountStatus = user.accountStatus;
    const currentRoles = (user.roles || []).map((role) => normalizeRoleAssignment(role)).filter(Boolean);

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
    const providerRoleValidation = validateProviderRoleAssignmentChange(user, user.roles, currentRoles);
    if (!providerRoleValidation.valid) {
      return res.status(400).json({ message: providerRoleValidation.message });
    }

    const validation = validateManagedUserState({
      accountStatus: user.accountStatus,
      roles: user.roles,
      activeRole: nextActiveRole,
      primaryRole: nextPrimaryRole
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    if (String(user._id) === String(req.user._id)) {
      const resultingAdminRole = user.roles.find((role) => role.roleKey === 'admin');
      if (!canUseRole(resultingAdminRole) || user.accountStatus !== 'active' || nextActiveRole !== 'admin') {
        return res.status(400).json({ message: 'You cannot remove or deactivate your own active admin access' });
      }
    }

    user.roles = (user.roles || []).map((role) => ({
      ...toPlain(role),
      isPrimary: role.roleKey === nextPrimaryRole
    }));
    user.role = nextActiveRole;

    const afterIdentityPreview = buildIdentitySnapshot(user);
    const afterRolePreview = buildRoleSnapshot({
      ...toPlain(user),
      role: user.role,
      roles: user.roles
    });

    const accountStatusChanged = previousAccountStatus !== user.accountStatus;
    const identityChanged = !snapshotsEqual(beforeIdentitySnapshot, afterIdentityPreview);
    const assignedRolesChanged = !snapshotsEqual(beforeRoleSnapshot.roles, afterRolePreview.roles);
    const activeRoleChanged = beforeRoleSnapshot.activeRole !== afterRolePreview.activeRole;
    const primaryRoleChanged = beforeRoleSnapshot.primaryRole !== afterRolePreview.primaryRole;
    const rolesChanged = assignedRolesChanged || activeRoleChanged || primaryRoleChanged;

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
        actionType: 'admin.user_record.updated',
        beforeSnapshot: beforeIdentitySnapshot,
        afterSnapshot: buildIdentitySnapshot(user)
      }));
    }

    if (assignedRolesChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'admin.assigned_roles.updated',
        beforeSnapshot: buildAssignedRolesSnapshot({ roles: beforeRoleSnapshot.roles }),
        afterSnapshot: buildAssignedRolesSnapshot(user)
      }));
    }

    if (activeRoleChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'admin.active_role.updated',
        beforeSnapshot: { activeRole: beforeRoleSnapshot.activeRole },
        afterSnapshot: { activeRole: user.role }
      }));
    }

    if (primaryRoleChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'admin.primary_role.updated',
        beforeSnapshot: { primaryRole: beforeRoleSnapshot.primaryRole },
        afterSnapshot: { primaryRole: getPrimaryRole(user) }
      }));
    }

    if (rolesChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'admin.role_state.updated',
        beforeSnapshot: beforeRoleSnapshot,
        afterSnapshot: buildRoleSnapshot(user)
      }));
    }

    if (accountStatusChanged) {
      auditEvents.push(logAuditEvent({
        actorUserId: req.user._id,
        targetUserId: user._id,
        actionType: 'admin.account_status.updated',
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

    if (
      error.message?.includes('must be a valid email address')
      || error.message?.includes('must be 3-30 characters')
      || error.message?.includes('is required')
    ) {
      return res.status(400).json({ message: error.message });
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

    const application = getLatestPendingProviderApplication(user, roleKey);
    if (!application || application.status !== 'pending') {
      return res.status(404).json({ message: 'No pending application found for this role' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);
    let roleAssignment = getRoleAssignment(user, roleKey);
    const requiredDocuments = roleKey === 'driver'
      ? ['nicDocument', 'drivingLicenseDocument', 'proofOfAddressDocument']
      : ['businessRegistrationDocument', 'proofOfAddressDocument'];
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
      const currentProfile = roleKey === 'driver'
        ? {
            ...toPlain(user.driverProfile),
            documents: normalizeDriverDocuments(toPlain(user.driverProfile)?.documents || {})
          }
        : {
            ...toPlain(user.staffProfile),
            documents: normalizeStaffDocuments(toPlain(user.staffProfile)?.documents || {})
          };
      const applicationSnapshot = {
        ...currentProfile,
        ...(application.applicationData || {}),
        documents: {
          ...(currentProfile?.documents || {}),
          ...((application.applicationData || {}).documents || {})
        }
      };
      const validation = validateProviderApplicationSnapshot(roleKey, applicationSnapshot, user);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
      const reviewedAt = new Date();
      const reviewedDocuments = setDocumentCollectionStatus(applicationSnapshot.documents, requiredDocuments, {
        status: 'approved',
        reviewedAt
      });

      if (roleKey === 'driver') {
        user.driverProfile = {
          ...currentProfile,
          ...applicationSnapshot,
          documents: reviewedDocuments
        };
      } else {
        user.staffProfile = {
          ...currentProfile,
          ...applicationSnapshot,
          documents: reviewedDocuments
        };
      }

      application.status = 'approved';
      application.reviewedAt = reviewedAt;
      application.reviewedBy = req.user._id;
      application.rejectionReason = '';
      application.applicationData = {
        ...applicationSnapshot,
        documents: reviewedDocuments
      };
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
      if (!trimmedReason) {
        return res.status(400).json({ message: 'A rejection reason is required' });
      }

      const currentProfile = roleKey === 'driver'
        ? {
            ...toPlain(user.driverProfile),
            documents: normalizeDriverDocuments(toPlain(user.driverProfile)?.documents || {})
          }
        : {
            ...toPlain(user.staffProfile),
            documents: normalizeStaffDocuments(toPlain(user.staffProfile)?.documents || {})
          };
      const applicationSnapshot = {
        ...currentProfile,
        ...(application.applicationData || {}),
        documents: {
          ...(currentProfile?.documents || {}),
          ...((application.applicationData || {}).documents || {})
        }
      };
      const reviewedAt = new Date();
      const reviewedDocuments = setDocumentCollectionStatus(applicationSnapshot.documents, requiredDocuments, {
        status: 'rejected',
        rejectionReason: trimmedReason,
        reviewedAt
      });

      if (roleKey === 'driver') {
        user.driverProfile = {
          ...currentProfile,
          ...applicationSnapshot,
          documents: reviewedDocuments
        };
      } else {
        user.staffProfile = {
          ...currentProfile,
          ...applicationSnapshot,
          documents: reviewedDocuments
        };
      }

      application.status = 'rejected';
      application.reviewedAt = reviewedAt;
      application.reviewedBy = req.user._id;
      application.rejectionReason = trimmedReason;
      application.applicationData = {
        ...applicationSnapshot,
        documents: reviewedDocuments
      };
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
      actionType: `admin.provider_application.${action === 'approve' ? 'approved' : 'rejected'}`,
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

const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own admin account' });
    }

    if (isProtectedAdminAccount(user)) {
      return res.status(403).json({ message: 'Protected admin accounts cannot be deactivated through this workflow' });
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
      actionType: 'admin.account_status.updated',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user),
      reason: 'deactivated'
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

const restoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isProtectedAdminAccount(user)) {
      return res.status(403).json({ message: 'Protected admin accounts cannot be restored through this workflow' });
    }

    if (user.accountStatus !== 'deactivated') {
      return res.status(400).json({ message: 'Only deactivated accounts can be restored' });
    }

    const beforeSnapshot = buildUserAuditSnapshot(user);

    user.accountStatus = 'active';
    user.deactivatedAt = null;
    appendNotification(user, {
      type: 'admin',
      title: 'Account restored',
      message: 'An administrator restored access to your account. You can sign in again.',
      link: '/signin'
    });

    syncUserRoles(user);
    await user.save();

    await logAuditEvent({
      actorUserId: req.user._id,
      targetUserId: user._id,
      actionType: 'admin.account_status.updated',
      beforeSnapshot,
      afterSnapshot: buildUserAuditSnapshot(user),
      reason: 'restored'
    });

    await addNotificationToUser(req.user._id, {
      type: 'admin',
      title: 'Account restored',
      message: `You restored ${user.fullName}'s account.`,
      link: '/admin/users'
    });

    res.json({
      message: 'Account restored',
      user: serializeUser(user)
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to restore user');
  }
};

module.exports = { getAllUsers, getUserRoleHistory, getUserProviderDocument, updateUser, reviewProviderApplication, deactivateUser, restoreUser };
