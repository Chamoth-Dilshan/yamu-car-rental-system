const User = require('./user.model')
const { buildUserAuditSnapshot, logAuditEvent, getRoleHistoryTimeline } = require('../../utils/auditHelpers')
const {
  addNotificationToAdmins,
  appendNotification,
  getUnreadNotificationCount,
  serializeNotification
} = require('../../utils/notificationHelpers')
const {
  getFileMetadataFromUpload,
  getFilesByField,
  removeUploadedFiles
} = require('../../utils/fileHelpers')
const {
  PROVIDER_ROLE_KEYS,
  buildRoleAssignment,
  canManageRoleProfile,
  canUseRole,
  createProviderApplication,
  getLatestPendingProviderApplication,
  getProviderRequirementConfig,
  getRoleAssignment,
  serializeUser,
  syncUserRoles
} = require('../../utils/roleHelpers')
const {
  mergeDriverDocuments,
  mergeStaffDocuments,
  normalizeEmergencyContact,
  normalizeDriverDocuments,
  normalizePreferredLanguage,
  normalizeSriLankanDrivingLicenseNumber,
  normalizeSriLankanNic,
  normalizeStaffDocuments,
  parseDate,
  setDocumentCollectionStatus,
  trimValue,
  validateEmailAddress,
  validateOptionalPhone,
  validateRequiredTextFields,
  validatePasswordStrength,
  validateUsernameValue
} = require('../../utils/profileHelpers')
const {
  validateDriverApplicationStandards,
  validateProviderApplicationData,
  validateRestrictedProfileFields
} = require('./user.validation')

const roleLabel = (value) => ({
  customer: 'User',
  staff: 'Store',
  driver: 'Driver',
  admin: 'Admin'
}[value] || value.charAt(0).toUpperCase() + value.slice(1))

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

const getPlainObject = (value) => (value?.toObject ? value.toObject() : (value || {}))

const getProviderDocumentKeys = (roleKey) => (
  getProviderRequirementConfig(roleKey).documents.map(({ key }) => key)
)

const mergeUploadedDocumentFiles = (roleKey, payload = {}, files = {}, uploadDir = '') => {
  const filesByField = getFilesByField(files)
  const documentKeys = getProviderDocumentKeys(roleKey)
  const uploadedDocuments = documentKeys.reduce((acc, documentKey) => {
    const file = filesByField[documentKey]

    if (!file) {
      return acc
    }

    return {
      ...acc,
      [documentKey]: getFileMetadataFromUpload(file, uploadDir)
    }
  }, {})

  if (!Object.keys(uploadedDocuments).length) {
    return payload
  }

  return {
    ...payload,
    documents: {
      ...(payload.documents || {}),
      ...uploadedDocuments
    }
  }
}

const getProviderDocumentMetadata = (user, roleKey, documentKey) => {
  if (!PROVIDER_ROLE_KEYS.includes(roleKey) || !getProviderDocumentKeys(roleKey).includes(documentKey)) {
    return null
  }

  const profile = roleKey === 'driver' ? user.driverProfile : user.staffProfile
  const profileDocument = profile?.documents?.[documentKey]

  if (profileDocument?.filePath) {
    return profileDocument
  }

  const applicationDocument = getLatestPendingProviderApplication(user, roleKey)?.applicationData?.documents?.[documentKey]
  return applicationDocument?.filePath ? applicationDocument : profileDocument
}

const buildDriverProfilePayload = (payload = {}, currentProfile = {}) => {
  const current = getPlainObject(currentProfile)

  return {
    drivingLicenseNumber: normalizeSriLankanDrivingLicenseNumber(
      trimValue(payload.drivingLicenseNumber, current.drivingLicenseNumber || '')
    ),
    licenseExpiryDate: parseDate(payload.licenseExpiryDate) || null,
    nicId: normalizeSriLankanNic(trimValue(payload.nicId, current.nicId || '')),
    serviceArea: trimValue(payload.serviceArea, current.serviceArea || ''),
    providerDetails: trimValue(payload.providerDetails, current.providerDetails || ''),
    documents: mergeDriverDocuments(payload.documents || {}, current.documents || {})
  }
}

const buildStaffProfilePayload = (payload = {}, currentProfile = {}) => {
  const current = getPlainObject(currentProfile)

  return {
    storeName: trimValue(payload.storeName, current.storeName || ''),
    storeOwner: trimValue(payload.storeOwner, current.storeOwner || ''),
    businessRegistrationNumber: trimValue(payload.businessRegistrationNumber, current.businessRegistrationNumber || ''),
    storeAddress: trimValue(payload.storeAddress, current.storeAddress || ''),
    storeContactNumber: trimValue(payload.storeContactNumber, current.storeContactNumber || ''),
    storeEmail: trimValue(payload.storeEmail, current.storeEmail || ''),
    documents: mergeStaffDocuments(payload.documents || {}, current.documents || {})
  }
}

const serializeNotifications = (user) => ({
  notifications: [...(user.notifications || [])]
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .map(serializeNotification),
  unreadCount: getUnreadNotificationCount(user)
})

const cleanupFilesAndReturn = (files, result) => {
  removeUploadedFiles(files)
  return result
}

const getProfile = async (userId) => {
  const user = await User.findById(userId).select('-password')

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  syncUserRoles(user)
  return { user: serializeUser(user) }
}

const getMyRoleHistory = async ({ userId, limit }) => {
  const resolvedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const items = await getRoleHistoryTimeline(userId, resolvedLimit)

  return { items }
}

const updateProfile = async ({ userId, body, file }) => {
  const user = await User.findById(userId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  const restrictedFieldsValidation = validateRestrictedProfileFields(body)
  if (restrictedFieldsValidation.error) {
    return { error: restrictedFieldsValidation.error, statusCode: 400 }
  }

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

  const phoneValidation = validateOptionalPhone(body.phone)
  if (phoneValidation.error) {
    return { error: phoneValidation.error, statusCode: 400 }
  }

  const emergencyPhoneValidation = validateOptionalPhone(body.emergencyContactPhone, {
    label: 'Emergency contact phone'
  })
  if (emergencyPhoneValidation.error) {
    return { error: emergencyPhoneValidation.error, statusCode: 400 }
  }

  if (body.confirmPassword && !body.password) {
    return { error: 'New password is required to confirm password', statusCode: 400 }
  }

  if (body.password) {
    const passwordError = validatePasswordStrength(body.password)
    if (passwordError) {
      return { error: passwordError, statusCode: 400 }
    }

    if (!body.currentPassword) {
      return { error: 'Current password is required to set a new password', statusCode: 400 }
    }

    if (!(await user.matchPassword(body.currentPassword))) {
      return { error: 'Current password is incorrect', statusCode: 400 }
    }

    if (!body.confirmPassword) {
      return { error: 'Confirm password is required', statusCode: 400 }
    }

    if (body.password !== body.confirmPassword) {
      return { error: 'Passwords do not match', statusCode: 400 }
    }

    if (await user.matchPassword(body.password)) {
      return { error: 'New password must be different from the current password', statusCode: 400 }
    }
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  user.fullName = trimValue(body.fullName, user.fullName)
  user.email = normalizedEmail
  user.username = normalizedUsername
  user.phone = phoneValidation.value
  user.address = trimValue(body.address, '')
  user.city = trimValue(body.city, '')
  user.dob = trimValue(body.dob, '')
  user.bio = trimValue(body.bio, '')
  user.preferredLanguage = normalizePreferredLanguage(body.preferredLanguage, user.preferredLanguage || 'English')
  user.emergencyContact = normalizeEmergencyContact({
    name: body.emergencyContactName,
    phone: emergencyPhoneValidation.value,
    relationship: body.emergencyContactRelationship
  })

  if (file) {
    user.profilePic = `profiles/${file.filename}`
  }

  if (body.password) {
    user.password = body.password
  }

  await user.save()
  await logAuditEvent({
    actorUserId: user._id,
    targetUserId: user._id,
    actionType: 'user.profile.updated',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user)
  })

  return { user: serializeUser(user) }
}

const updateDriverProfile = async ({ userId, payload, files, uploadDir }) => {
  const user = await User.findById(userId)

  if (!user) {
    return cleanupFilesAndReturn(files, { error: 'User not found', statusCode: 404 })
  }

  const roleAssignment = getRoleAssignment(user, 'driver')
  if (!canManageRoleProfile(roleAssignment)) {
    return cleanupFilesAndReturn(files, {
      error: 'Driver onboarding is available only for assigned driver applicants or roles',
      statusCode: 403
    })
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  const documentKeys = getProviderRequirementConfig('driver').documents.map(({ key }) => key)
  const driverPayload = mergeUploadedDocumentFiles('driver', payload, files, uploadDir)
  const nextDriverProfile = buildDriverProfilePayload(driverPayload, user.driverProfile)
  const profileValidation = validateDriverApplicationStandards(nextDriverProfile, { required: false })
  if (!profileValidation.valid) {
    return cleanupFilesAndReturn(files, { error: profileValidation.message, statusCode: 400 })
  }

  user.driverProfile = {
    ...getPlainObject(user.driverProfile),
    ...nextDriverProfile
  }

  const pendingApplication = getLatestPendingProviderApplication(user, 'driver')
  if (pendingApplication?.status === 'pending') {
    const pendingValidation = validateProviderApplicationData('driver', user.driverProfile)
    if (!pendingValidation.valid) {
      return cleanupFilesAndReturn(files, { error: pendingValidation.message, statusCode: 400 })
    }

    user.driverProfile.documents = setDocumentCollectionStatus(user.driverProfile.documents, documentKeys, { status: 'pending' })
    pendingApplication.applicationData = {
      ...pendingApplication.applicationData,
      ...getPlainObject(user.driverProfile),
      documents: setDocumentCollectionStatus(
        normalizeDriverDocuments(getPlainObject(user.driverProfile)?.documents || {}),
        documentKeys,
        { status: 'pending' }
      )
    }
    pendingApplication.submittedAt = new Date()
  }

  await user.save({ validateModifiedOnly: true })
  await logAuditEvent({
    actorUserId: user._id,
    targetUserId: user._id,
    actionType: 'user.driver_profile.updated',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user)
  })

  return {
    message: 'Driver profile updated',
    driverProfile: user.driverProfile,
    user: serializeUser(user)
  }
}

const updateStaffProfile = async ({ userId, payload, files, uploadDir }) => {
  const user = await User.findById(userId)

  if (!user) {
    return cleanupFilesAndReturn(files, { error: 'User not found', statusCode: 404 })
  }

  const roleAssignment = getRoleAssignment(user, 'staff')
  if (!canManageRoleProfile(roleAssignment)) {
    return cleanupFilesAndReturn(files, {
      error: 'Store onboarding is available only for assigned store applicants or roles',
      statusCode: 403
    })
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  const documentKeys = getProviderRequirementConfig('staff').documents.map(({ key }) => key)
  const staffPayload = mergeUploadedDocumentFiles('staff', payload, files, uploadDir)
  user.staffProfile = {
    ...getPlainObject(user.staffProfile),
    ...buildStaffProfilePayload(staffPayload, user.staffProfile)
  }

  const pendingApplication = getLatestPendingProviderApplication(user, 'staff')
  if (pendingApplication?.status === 'pending') {
    user.staffProfile.documents = setDocumentCollectionStatus(user.staffProfile.documents, documentKeys, { status: 'pending' })
    pendingApplication.applicationData = {
      ...pendingApplication.applicationData,
      ...getPlainObject(user.staffProfile),
      documents: setDocumentCollectionStatus(
        normalizeStaffDocuments(getPlainObject(user.staffProfile)?.documents || {}),
        documentKeys,
        { status: 'pending' }
      )
    }
    pendingApplication.submittedAt = new Date()
  }

  await user.save({ validateModifiedOnly: true })
  await logAuditEvent({
    actorUserId: user._id,
    targetUserId: user._id,
    actionType: 'user.staff_profile.updated',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user)
  })

  return {
    message: 'Store profile updated',
    staffProfile: user.staffProfile,
    user: serializeUser(user)
  }
}

const updateAdminProfile = async ({ userId, body }) => {
  const user = await User.findById(userId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  const roleAssignment = getRoleAssignment(user, 'admin')
  if (!canUseRole(roleAssignment)) {
    return { error: 'Admin profile access is restricted to admin users', statusCode: 403 }
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  user.adminProfile = {
    ...user.adminProfile,
    accessScope: trimValue(body.accessScope, ''),
    controlNotes: trimValue(body.controlNotes, '')
  }

  await user.save({ validateModifiedOnly: true })
  await logAuditEvent({
    actorUserId: user._id,
    targetUserId: user._id,
    actionType: 'user.admin_profile.updated',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user)
  })

  return {
    message: 'Admin profile updated',
    adminProfile: user.adminProfile,
    user: serializeUser(user)
  }
}

const applyForProviderRole = async ({ userId, roleKey, payload, files, uploadDir }) => {
  const user = await User.findById(userId)

  if (!user) {
    return cleanupFilesAndReturn(files, { error: 'User not found', statusCode: 404 })
  }

  if (!PROVIDER_ROLE_KEYS.includes(roleKey)) {
    return cleanupFilesAndReturn(files, { error: 'Unsupported provider role application', statusCode: 400 })
  }

  if (!canUseRole(getRoleAssignment(user, 'customer'))) {
    return cleanupFilesAndReturn(files, {
      error: 'Only accounts with active user access can apply for provider roles',
      statusCode: 403
    })
  }

  const roleAssignment = getRoleAssignment(user, roleKey)
  if (roleAssignment && canUseRole(roleAssignment)) {
    return cleanupFilesAndReturn(files, { error: `Your ${roleKey} role is already approved`, statusCode: 400 })
  }

  if (roleAssignment && ['suspended', 'deactivated'].includes(roleAssignment.roleStatus)) {
    return cleanupFilesAndReturn(files, {
      error: `Your ${roleKey} access is currently restricted. Contact an administrator for help.`,
      statusCode: 403
    })
  }

  if (getLatestPendingProviderApplication(user, roleKey)) {
    return cleanupFilesAndReturn(files, { error: `A ${roleKey} application is already pending review`, statusCode: 400 })
  }

  const providerPayload = mergeUploadedDocumentFiles(roleKey, payload, files, uploadDir)
  const applicationData = roleKey === 'driver'
    ? buildDriverProfilePayload(providerPayload, user.driverProfile)
    : buildStaffProfilePayload(providerPayload, user.staffProfile)
  const documentKeys = getProviderRequirementConfig(roleKey).documents.map(({ key }) => key)

  const validation = validateProviderApplicationData(roleKey, applicationData)
  if (!validation.valid) {
    return cleanupFilesAndReturn(files, { error: validation.message, statusCode: 400 })
  }

  const nextApplicationData = {
    ...applicationData,
    documents: setDocumentCollectionStatus(applicationData.documents, documentKeys, { status: 'pending' })
  }

  if (roleKey === 'driver') {
    user.driverProfile = {
      ...getPlainObject(user.driverProfile),
      ...nextApplicationData
    }
  }

  if (roleKey === 'staff') {
    user.staffProfile = {
      ...getPlainObject(user.staffProfile),
      ...nextApplicationData
    }
  }

  if (!roleAssignment) {
    user.roles.push(buildRoleAssignment(roleKey, {
      roleStatus: 'pending',
      verificationStatus: 'pending',
      isPrimary: false
    }))
  } else {
    roleAssignment.roleStatus = 'pending'
    roleAssignment.verificationStatus = 'pending'
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  createProviderApplication(user, roleKey, nextApplicationData)
  syncUserRoles(user)
  appendNotification(user, {
    type: 'role',
    title: `${roleLabel(roleKey)} application submitted`,
    message: `Your ${roleKey} application was sent for admin review. We will notify you once it is reviewed.`,
    link: '/apply-roles'
  })
  await user.save()
  await logAuditEvent({
    actorUserId: user._id,
    targetUserId: user._id,
    actionType: 'user.provider_application.submitted',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user),
    reason: roleKey
  })

  await addNotificationToAdmins({
    type: 'role',
    title: 'Provider application submitted',
    message: `${user.fullName} submitted a ${roleKey} application for review.`,
    link: '/admin/pending-approvals'
  })

  return {
    message: `${roleKey} application submitted for admin review`,
    user: serializeUser(user)
  }
}

const withdrawProviderApplication = async ({ userId, roleKey }) => {
  const user = await User.findById(userId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  if (!PROVIDER_ROLE_KEYS.includes(roleKey)) {
    return { error: 'Unsupported provider role application', statusCode: 400 }
  }

  const application = getLatestPendingProviderApplication(user, roleKey)
  if (!application || application.status !== 'pending') {
    return { error: 'No pending application found for this role', statusCode: 404 }
  }

  const beforeSnapshot = buildUserAuditSnapshot(user)
  application.status = 'withdrawn'
  application.reviewedAt = null
  application.reviewedBy = null
  application.rejectionReason = ''

  user.roles = (user.roles || []).filter((role) => {
    if (role.roleKey !== roleKey) {
      return true
    }

    return canUseRole(role)
  })

  syncUserRoles(user)
  appendNotification(user, {
    type: 'role',
    title: 'Application withdrawn',
    message: `Your ${roleKey} application has been withdrawn.`,
    link: '/apply-roles'
  })
  await user.save()
  await logAuditEvent({
    actorUserId: user._id,
    targetUserId: user._id,
    actionType: 'user.provider_application.withdrawn',
    beforeSnapshot,
    afterSnapshot: buildUserAuditSnapshot(user),
    reason: roleKey
  })

  await addNotificationToAdmins({
    type: 'role',
    title: 'Provider application withdrawn',
    message: `${user.fullName} withdrew a pending ${roleKey} application.`,
    link: '/admin/pending-approvals'
  })

  return {
    message: `${roleKey} application withdrawn`,
    user: serializeUser(user)
  }
}

const getProviderDocument = async ({ userId, roleKey, documentKey }) => {
  const user = await User.findById(userId).select('-password')

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  const document = getProviderDocumentMetadata(user, roleKey, documentKey)
  if (!document?.filePath) {
    return { error: 'Document not found', statusCode: 404 }
  }

  return { document }
}

const getNotifications = async (userId) => {
  const user = await User.findById(userId).select('notifications')

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  return serializeNotifications(user)
}

const markNotificationRead = async ({ userId, notificationId }) => {
  const user = await User.findById(userId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  const notification = (user.notifications || []).id(notificationId)

  if (!notification) {
    return { error: 'Notification not found', statusCode: 404 }
  }

  notification.isRead = true
  notification.readAt = new Date()
  await user.save({ validateModifiedOnly: true })

  return serializeNotifications(user)
}

const markAllNotificationsRead = async (userId) => {
  const user = await User.findById(userId)

  if (!user) {
    return { error: 'User not found', statusCode: 404 }
  }

  (user.notifications || []).forEach((notification) => {
    notification.isRead = true
    notification.readAt = notification.readAt || new Date()
  })

  await user.save({ validateModifiedOnly: true })

  return {
    ...serializeNotifications(user),
    unreadCount: 0
  }
}

module.exports = {
  getProfile,
  getMyRoleHistory,
  updateProfile,
  updateDriverProfile,
  updateStaffProfile,
  updateAdminProfile,
  applyForProviderRole,
  withdrawProviderApplication,
  getProviderDocument,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
}
