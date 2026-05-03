const User = require('../users/user.model')
const { addNotificationToUser, appendNotification } = require('../../utils/notificationHelpers')
const { buildUserAuditSnapshot, logAuditEvent, getRoleHistoryTimeline } = require('../../utils/auditHelpers')
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
} = require('../../utils/roleHelpers')
const {
  hasDocumentFile,
  normalizeDriverDocuments,
  normalizeStaffDocuments,
  setDocumentCollectionStatus,
  trimValue,
  validateEmailAddress,
  validateRequiredTextFields,
  validateUsernameValue
} = require('../../utils/profileHelpers')

const MANAGEABLE_ROLE_KEYS = [...ROLE_KEYS]

const roleLabel = (value) => ({
  customer: 'User',
  staff: 'Store',
  driver: 'Driver',
  admin: 'Admin'
}[value] || value.charAt(0).toUpperCase() + value.slice(1))
const toPlain = (value) => (value?.toObject ? value.toObject() : value)
const snapshotsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const isProtectedAdminAccount = (user) => Boolean(user?.isSystemAdmin)

const ensureUniqueIdentityFields = async (userId, email, username) => {
  const emailValidation = validateEmailAddress(email)
  if (emailValidation.error) {
    throw new Error(emailValidation.error)
  }

  const usernameValidation = validateUsernameValue(username)
  if (usernameValidation.error) {
    throw new Error(usernameValidation.error)
  }

  const existing = await User.findOne({
    _id: { $ne: userId },
    $or: [{ email: emailValidation.value }, { username: usernameValidation.value }]
  })

  if (existing) {
    throw new Error('Email or username is already in use')
  }

  return {
    normalizedEmail: emailValidation.value,
    normalizedUsername: usernameValidation.value
  }
}

const buildManageableRoles = (incomingRoles = []) => {
  const nextRoles = []

  incomingRoles.forEach((role) => {
    if (!MANAGEABLE_ROLE_KEYS.includes(role.roleKey)) {
      return
    }

    const normalizedRole = normalizeRoleAssignment(role)
    if (!normalizedRole || nextRoles.some((item) => item.roleKey === normalizedRole.roleKey)) {
      return
    }

    nextRoles.push(normalizedRole)
  })

  if (!nextRoles.some((role) => role.roleKey === 'customer')) {
    nextRoles.unshift(buildRoleAssignment('customer', { isPrimary: true }))
  }

  return nextRoles
}

const validateProviderRoleAssignmentChange = (user, nextRoles = [], currentRoles = []) => {
  for (const roleKey of ['driver', 'staff']) {
    const nextRole = nextRoles.find((role) => role.roleKey === roleKey)
    if (!nextRole) {
      continue
    }

    const currentRole = currentRoles.find((role) => role.roleKey === roleKey)
    const latestPendingApplication = getLatestPendingProviderApplication(user, roleKey)
    const latestApprovedApplication = getLatestApprovedProviderApplication(user, roleKey)
    const roleBecameUsable = canUseRole(nextRole) && !canUseRole(currentRole)
    const roleStateChangedWhilePending = latestPendingApplication
      && (
        !currentRole
        || currentRole.roleStatus !== nextRole.roleStatus
        || currentRole.verificationStatus !== nextRole.verificationStatus
      )

    if (roleStateChangedWhilePending) {
      return {
        valid: false,
        message: `Use the provider review workflow to approve or reject the pending ${roleKey} application`
      }
    }

    if (roleBecameUsable && !latestApprovedApplication) {
      return {
        valid: false,
        message: `${roleKey} cannot become active until an approved application exists`
      }
    }
  }

  return { valid: true }
}

const buildProviderApplicationAssessment = (roleKey, applicationData = {}, user = {}) => {
  const config = getProviderRequirementConfig(roleKey)
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
  ]
  const missingItems = checks.filter((item) => item.blocking && !item.complete).map((item) => item.label)

  return {
    checks,
    missingItems,
    valid: missingItems.length === 0
  }
}

const validateProviderApplicationSnapshot = (roleKey, applicationData = {}, user = {}) => {
  const assessment = buildProviderApplicationAssessment(roleKey, applicationData, user)

  if (!assessment.valid) {
    return {
      valid: false,
      message: `Cannot approve ${roleKey} application. Missing required items: ${assessment.missingItems.join(', ')}`,
      missingItems: assessment.missingItems
    }
  }

  return {
    valid: true,
    assessment
  }
}

const buildIdentitySnapshot = (user) => ({
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  driverProfile: {
    nicId: user.driverProfile?.nicId || ''
  }
})

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
})

const buildAssignedRolesSnapshot = (user) => (
  (user.roles || []).map((role) => ({
    roleKey: role.roleKey,
    roleStatus: role.roleStatus,
    verificationStatus: role.verificationStatus,
    isPrimary: Boolean(role.isPrimary)
  }))
)

const buildRoleChangeMessage = (user) => {
  const roleList = (user.roles || []).map((role) => roleLabel(role.roleKey)).join(', ')
  return `An administrator updated your role access. Current roles: ${roleList}.`
}

const listUsers = async () => {
  const users = await User.find()
    .select('-password')
    .populate('providerApplications.reviewedBy', 'fullName email')
    .sort({ createdAt: -1 })

  return users.map(serializeUser)
}

const getUserRoleHistory = async ({ userId, limit }) => {
  const user = await User.findById(userId).select('_id')

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const items = await getRoleHistoryTimeline(user._id, resolvedLimit)

  return { items }
}

const getUserProviderDocument = async ({ userId, roleKey, documentKey }) => {
  if (!['driver', 'staff'].includes(roleKey)) {
    return { error: 'Unsupported provider role', statusCode: 400 }
  }

  const documentKeys = getProviderRequirementConfig(roleKey).documents.map(({ key }) => key)
  if (!documentKeys.includes(documentKey)) {
    return { error: 'Unsupported provider document', statusCode: 400 }
  }

  const user = await User.findById(userId).select('-password')
  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  const pendingApplication = getLatestPendingProviderApplication(user, roleKey)
  const pendingApplicationDocument = pendingApplication?.applicationData?.documents?.[documentKey]
  const profile = roleKey === 'driver' ? user.driverProfile : user.staffProfile
  const profileDocument = profile?.documents?.[documentKey]
  const document = pendingApplicationDocument?.filePath ? pendingApplicationDocument : profileDocument

  if (!document?.filePath) {
    return { error: 'Document not found', statusCode: 404 }
  }

  return { document }
}

const updateUser = async ({ targetUserId, actorUserId, body }) => {
  const user = await User.findById(targetUserId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  if (isProtectedAdminAccount(user)) {
    return { error: 'Protected admin accounts are not editable through this workflow', statusCode: 403 }
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  const beforeIdentitySnapshot = buildIdentitySnapshot(user)
  const beforeRoleSnapshot = buildRoleSnapshot(user)
  const previousAccountStatus = user.accountStatus
  const currentRoles = (user.roles || []).map((role) => normalizeRoleAssignment(role)).filter(Boolean)

  const nextEmail = body.email || user.email
  const nextUsername = body.username || user.username || nextEmail
  const missingIdentityField = validateRequiredTextFields([
    ['Full name', body.fullName ?? user.fullName],
    ['Email', nextEmail],
    ['Username', nextUsername]
  ])

  if (missingIdentityField) {
    return { error: `${missingIdentityField} is required`, statusCode: 400 }
  }

  const { normalizedEmail, normalizedUsername } = await ensureUniqueIdentityFields(
    user._id,
    nextEmail,
    nextUsername
  )

  user.fullName = trimValue(body.fullName, user.fullName)
  user.email = normalizedEmail
  user.username = normalizedUsername

  if (body.driverProfile && typeof body.driverProfile === 'object') {
    const currentDriverProfile = toPlain(user.driverProfile) || {}
    user.driverProfile = {
      ...currentDriverProfile,
      nicId: trimValue(body.driverProfile.nicId, currentDriverProfile.nicId || '')
    }
  }

  if (body.accountStatus) {
    if (!ACCOUNT_STATUSES.includes(body.accountStatus)) {
      return { error: 'Invalid account status', statusCode: 400 }
    }

    user.accountStatus = body.accountStatus
    user.deactivatedAt = body.accountStatus === 'deactivated' ? (user.deactivatedAt || new Date()) : null
  }

  if (Array.isArray(body.roles)) {
    user.roles = buildManageableRoles(body.roles)
  }

  const nextPrimaryRole = trimValue(body.primaryRole, getPrimaryRole(user))
  const nextActiveRole = trimValue(body.activeRole, user.role)
  const providerRoleValidation = validateProviderRoleAssignmentChange(user, user.roles, currentRoles)
  if (!providerRoleValidation.valid) {
    return { error: providerRoleValidation.message, statusCode: 400 }
  }

  const validation = validateManagedUserState({
    accountStatus: user.accountStatus,
    roles: user.roles,
    activeRole: nextActiveRole,
    primaryRole: nextPrimaryRole
  })

  if (!validation.valid) {
    return { error: validation.message, statusCode: 400 }
  }

  if (String(user._id) === String(actorUserId)) {
    const resultingAdminRole = user.roles.find((role) => role.roleKey === 'admin')
    if (!canUseRole(resultingAdminRole) || user.accountStatus !== 'active' || nextActiveRole !== 'admin') {
      return { error: 'You cannot remove or deactivate your own active admin access', statusCode: 400 }
    }
  }

  user.roles = (user.roles || []).map((role) => ({
    ...toPlain(role),
    isPrimary: role.roleKey === nextPrimaryRole
  }))
  user.role = nextActiveRole

  const afterIdentityPreview = buildIdentitySnapshot(user)
  const afterRolePreview = buildRoleSnapshot({
    ...toPlain(user),
    role: user.role,
    roles: user.roles
  })

  const accountStatusChanged = previousAccountStatus !== user.accountStatus
  const identityChanged = !snapshotsEqual(beforeIdentitySnapshot, afterIdentityPreview)
  const assignedRolesChanged = !snapshotsEqual(beforeRoleSnapshot.roles, afterRolePreview.roles)
  const activeRoleChanged = beforeRoleSnapshot.activeRole !== afterRolePreview.activeRole
  const primaryRoleChanged = beforeRoleSnapshot.primaryRole !== afterRolePreview.primaryRole
  const rolesChanged = assignedRolesChanged || activeRoleChanged || primaryRoleChanged

  if (accountStatusChanged) {
    appendNotification(user, {
      type: 'admin',
      title: user.accountStatus === 'active' ? 'Account reactivated' : 'Account deactivated',
      message: user.accountStatus === 'active'
        ? 'An administrator restored access to your account.'
        : 'An administrator deactivated your account. Contact support if you need access restored.',
      link: '/signin'
    })
  }

  if (rolesChanged) {
    appendNotification(user, {
      type: 'role',
      title: 'Role access updated',
      message: buildRoleChangeMessage(user),
      link: '/switch-roles'
    })
  }

  syncUserRoles(user)
  await user.save()

  const afterSnapshot = buildUserAuditSnapshot(user)
  const auditEvents = []

  if (identityChanged) {
    auditEvents.push(logAuditEvent({
      actorUserId,
      targetUserId: user._id,
      actionType: 'admin.user_record.updated',
      beforeSnapshot: beforeIdentitySnapshot,
      afterSnapshot: buildIdentitySnapshot(user)
    }))
  }

  if (assignedRolesChanged) {
    auditEvents.push(logAuditEvent({
      actorUserId,
      targetUserId: user._id,
      actionType: 'admin.assigned_roles.updated',
      beforeSnapshot: buildAssignedRolesSnapshot({ roles: beforeRoleSnapshot.roles }),
      afterSnapshot: buildAssignedRolesSnapshot(user)
    }))
  }

  if (activeRoleChanged) {
    auditEvents.push(logAuditEvent({
      actorUserId,
      targetUserId: user._id,
      actionType: 'admin.active_role.updated',
      beforeSnapshot: { activeRole: beforeRoleSnapshot.activeRole },
      afterSnapshot: { activeRole: user.role }
    }))
  }

  if (primaryRoleChanged) {
    auditEvents.push(logAuditEvent({
      actorUserId,
      targetUserId: user._id,
      actionType: 'admin.primary_role.updated',
      beforeSnapshot: { primaryRole: beforeRoleSnapshot.primaryRole },
      afterSnapshot: { primaryRole: getPrimaryRole(user) }
    }))
  }

  if (rolesChanged) {
    auditEvents.push(logAuditEvent({
      actorUserId,
      targetUserId: user._id,
      actionType: 'admin.role_state.updated',
      beforeSnapshot: beforeRoleSnapshot,
      afterSnapshot: buildRoleSnapshot(user)
    }))
  }

  if (accountStatusChanged) {
    auditEvents.push(logAuditEvent({
      actorUserId,
      targetUserId: user._id,
      actionType: 'admin.account_status.updated',
      beforeSnapshot,
      afterSnapshot
    }))
  }

  await Promise.all(auditEvents)

  await addNotificationToUser(actorUserId, {
    type: 'admin',
    title: 'User record updated',
    message: `You updated ${user.fullName}'s account settings.`,
    link: '/admin/users'
  })

  return { user: serializeUser(user) }
}

const reviewProviderApplication = async ({ targetUserId, actorUserId, roleKey, body }) => {
  const { action, rejectionReason = '' } = body
  const actionLabel = action === 'approve' ? 'approved' : 'rejected'

  if (!['driver', 'staff'].includes(roleKey)) {
    return { error: 'Unsupported provider role', statusCode: 400 }
  }

  if (!['approve', 'reject'].includes(action)) {
    return { error: 'Invalid review action', statusCode: 400 }
  }

  const user = await User.findById(targetUserId)
  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  const application = getLatestPendingProviderApplication(user, roleKey)
  if (!application || application.status !== 'pending') {
    return { error: 'No pending application found for this role', statusCode: 404 }
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  let roleAssignment = getRoleAssignment(user, roleKey)
  const requiredDocuments = roleKey === 'driver'
    ? ['nicDocument', 'drivingLicenseDocument', 'proofOfAddressDocument']
    : ['businessRegistrationDocument', 'proofOfAddressDocument']
  if (!roleAssignment) {
    roleAssignment = buildRoleAssignment(roleKey, {
      roleStatus: 'pending',
      verificationStatus: 'pending',
      isPrimary: false
    })
    user.roles.push(roleAssignment)
  }

  const trimmedReason = trimValue(rejectionReason, '')

  if (action === 'approve') {
    const currentProfile = roleKey === 'driver'
      ? {
          ...toPlain(user.driverProfile),
          documents: normalizeDriverDocuments(toPlain(user.driverProfile)?.documents || {})
        }
      : {
          ...toPlain(user.staffProfile),
          documents: normalizeStaffDocuments(toPlain(user.staffProfile)?.documents || {})
        }
    const applicationSnapshot = {
      ...currentProfile,
      ...(application.applicationData || {}),
      documents: {
        ...(currentProfile?.documents || {}),
        ...((application.applicationData || {}).documents || {})
      }
    }
    const validation = validateProviderApplicationSnapshot(roleKey, applicationSnapshot, user)
    if (!validation.valid) {
      return { error: validation.message, statusCode: 400 }
    }
    const reviewedAt = new Date()
    const reviewedDocuments = setDocumentCollectionStatus(applicationSnapshot.documents, requiredDocuments, {
      status: 'approved',
      reviewedAt
    })

    if (roleKey === 'driver') {
      user.driverProfile = {
        ...currentProfile,
        ...applicationSnapshot,
        documents: reviewedDocuments
      }
    } else {
      user.staffProfile = {
        ...currentProfile,
        ...applicationSnapshot,
        documents: reviewedDocuments
      }
    }

    application.status = 'approved'
    application.reviewedAt = reviewedAt
    application.reviewedBy = actorUserId
    application.rejectionReason = ''
    application.applicationData = {
      ...applicationSnapshot,
      documents: reviewedDocuments
    }
    roleAssignment.roleStatus = 'active'
    roleAssignment.verificationStatus = 'verified'
    appendNotification(user, {
      type: 'role',
      title: `${roleLabel(roleKey)} application approved`,
      message: `Your ${roleKey} role is now active and ready to use.`,
      link: '/switch-roles'
    })
  }

  if (action === 'reject') {
    if (!trimmedReason) {
      return { error: 'A rejection reason is required', statusCode: 400 }
    }

    const currentProfile = roleKey === 'driver'
      ? {
          ...toPlain(user.driverProfile),
          documents: normalizeDriverDocuments(toPlain(user.driverProfile)?.documents || {})
        }
      : {
          ...toPlain(user.staffProfile),
          documents: normalizeStaffDocuments(toPlain(user.staffProfile)?.documents || {})
        }
    const applicationSnapshot = {
      ...currentProfile,
      ...(application.applicationData || {}),
      documents: {
        ...(currentProfile?.documents || {}),
        ...((application.applicationData || {}).documents || {})
      }
    }
    const reviewedAt = new Date()
    const reviewedDocuments = setDocumentCollectionStatus(applicationSnapshot.documents, requiredDocuments, {
      status: 'rejected',
      rejectionReason: trimmedReason,
      reviewedAt
    })

    if (roleKey === 'driver') {
      user.driverProfile = {
        ...currentProfile,
        ...applicationSnapshot,
        documents: reviewedDocuments
      }
    } else {
      user.staffProfile = {
        ...currentProfile,
        ...applicationSnapshot,
        documents: reviewedDocuments
      }
    }

    application.status = 'rejected'
    application.reviewedAt = reviewedAt
    application.reviewedBy = actorUserId
    application.rejectionReason = trimmedReason
    application.applicationData = {
      ...applicationSnapshot,
      documents: reviewedDocuments
    }
    roleAssignment.roleStatus = 'rejected'
    roleAssignment.verificationStatus = 'rejected'
    appendNotification(user, {
      type: 'role',
      title: `${roleLabel(roleKey)} application rejected`,
      message: trimmedReason
        ? `Your ${roleKey} application was rejected: ${trimmedReason}`
        : `Your ${roleKey} application was rejected by admin.`,
      link: '/apply-roles'
    })
  }

  syncUserRoles(user)
  await user.save()

  await logAuditEvent({
    actorUserId,
    targetUserId: user._id,
    actionType: `admin.provider_application.${action === 'approve' ? 'approved' : 'rejected'}`,
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user),
    reason: trimmedReason
  })

  await addNotificationToUser(actorUserId, {
    type: 'admin',
    title: 'Application reviewed',
    message: `You ${actionLabel} the ${roleKey} application for ${user.fullName}.`,
    link: '/admin/pending-approvals'
  })

  return {
    message: `${roleKey} application ${actionLabel}`,
    user: serializeUser(user)
  }
}

const deactivateUser = async ({ targetUserId, actorUserId }) => {
  const user = await User.findById(targetUserId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  if (String(user._id) === String(actorUserId)) {
    return { error: 'You cannot deactivate your own admin account', statusCode: 400 }
  }

  if (isProtectedAdminAccount(user)) {
    return { error: 'Protected admin accounts cannot be deactivated through this workflow', statusCode: 403 }
  }

  if (user.accountStatus === 'deactivated') {
    return { error: 'This account is already deactivated', statusCode: 400 }
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)

  user.accountStatus = 'deactivated'
  user.deactivatedAt = new Date()
  appendNotification(user, {
    type: 'admin',
    title: 'Account deactivated',
    message: 'An administrator deactivated your account. Contact support if you need access restored.',
    link: '/signin'
  })

  syncUserRoles(user)
  await user.save()

  await logAuditEvent({
    actorUserId,
    targetUserId: user._id,
    actionType: 'admin.account_status.updated',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user),
    reason: 'deactivated'
  })

  await addNotificationToUser(actorUserId, {
    type: 'admin',
    title: 'Account deactivated',
    message: `You deactivated ${user.fullName}'s account.`,
    link: '/admin/users'
  })

  return {
    message: 'Account deactivated',
    user: serializeUser(user)
  }
}

const restoreUser = async ({ targetUserId, actorUserId }) => {
  const user = await User.findById(targetUserId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  if (isProtectedAdminAccount(user)) {
    return { error: 'Protected admin accounts cannot be restored through this workflow', statusCode: 403 }
  }

  if (user.accountStatus !== 'deactivated') {
    return { error: 'Only deactivated accounts can be restored', statusCode: 400 }
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)

  user.accountStatus = 'active'
  user.deactivatedAt = null
  appendNotification(user, {
    type: 'admin',
    title: 'Account restored',
    message: 'An administrator restored access to your account. You can sign in again.',
    link: '/signin'
  })

  syncUserRoles(user)
  await user.save()

  await logAuditEvent({
    actorUserId,
    targetUserId: user._id,
    actionType: 'admin.account_status.updated',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user),
    reason: 'restored'
  })

  await addNotificationToUser(actorUserId, {
    type: 'admin',
    title: 'Account restored',
    message: `You restored ${user.fullName}'s account.`,
    link: '/admin/users'
  })

  return {
    message: 'Account restored',
    user: serializeUser(user)
  }
}

module.exports = {
  listUsers,
  getUserRoleHistory,
  getUserProviderDocument,
  updateUser,
  reviewProviderApplication,
  deactivateUser,
  restoreUser
}
