const {
  ROLE_KEYS,
  buildRoleAssignment,
  canUseRole,
  getLatestApprovedProviderApplication,
  getLatestPendingProviderApplication,
  getProviderRequirementConfig,
  normalizeRoleAssignment
} = require('../../utils/roleHelpers')
const {
  hasDocumentFile,
  trimValue,
  validateLicenseExpiryDate,
  validateSriLankanDrivingLicenseNumber,
  validateSriLankanNic
} = require('../../utils/profileHelpers')

const MANAGEABLE_ROLE_KEYS = [...ROLE_KEYS]

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

const getProviderFieldValidationError = (roleKey, fieldKey, value) => {
  if (roleKey !== 'driver' || !trimValue(value, '')) {
    return ''
  }

  if (fieldKey === 'drivingLicenseNumber') {
    return validateSriLankanDrivingLicenseNumber(value, { required: false }).error || ''
  }

  if (fieldKey === 'licenseExpiryDate') {
    return validateLicenseExpiryDate(value, { required: false }).error || ''
  }

  if (fieldKey === 'nicId') {
    return validateSriLankanNic(value, { required: false }).error || ''
  }

  return ''
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
    ...config.fields.map(({ key, label }) => {
      const validationError = getProviderFieldValidationError(roleKey, key, applicationData[key])

      return {
        key,
        label,
        complete: Boolean(trimValue(applicationData[key], '')) && !validationError,
        blocking: true
      }
    }),
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

module.exports = {
  MANAGEABLE_ROLE_KEYS,
  buildManageableRoles,
  buildProviderApplicationAssessment,
  validateProviderApplicationSnapshot,
  validateProviderRoleAssignmentChange
}
