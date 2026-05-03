const { getProviderRequirementConfig } = require('../../utils/roleHelpers')
const {
  hasDocumentFile,
  trimValue,
  validateLicenseExpiryDate,
  validateSriLankanDrivingLicenseNumber,
  validateSriLankanNic
} = require('../../utils/profileHelpers')

const RESTRICTED_PROFILE_FIELDS = [
  'role',
  'roles',
  'activeRole',
  'primaryRole',
  'accountStatus',
  'verificationStatus',
  'isSystemAdmin',
  'permissions',
  'providerApplications',
  'emailVerified',
  'authProvider',
  'googleId'
]

const parseStructuredBody = (body = {}) => {
  if (body?.payload === undefined) {
    return { payload: body || {} }
  }

  if (typeof body.payload === 'object') {
    return { payload: body.payload || {} }
  }

  try {
    return { payload: JSON.parse(body.payload || '{}') }
  } catch {
    return { error: 'Invalid JSON payload' }
  }
}

const validateRestrictedProfileFields = (payload = {}) => {
  const restrictedField = RESTRICTED_PROFILE_FIELDS.find((field) => (
    Object.prototype.hasOwnProperty.call(payload, field)
  ))

  if (restrictedField) {
    return { error: 'Role and account status fields cannot be updated from profile settings' }
  }

  return { valid: true }
}

const validateDriverApplicationStandards = (applicationData = {}, { required = true } = {}) => {
  const drivingLicenseValidation = validateSriLankanDrivingLicenseNumber(applicationData.drivingLicenseNumber, { required })
  if (drivingLicenseValidation.error) {
    return { valid: false, message: drivingLicenseValidation.error }
  }

  const licenseExpiryValidation = validateLicenseExpiryDate(applicationData.licenseExpiryDate, { required })
  if (licenseExpiryValidation.error) {
    return { valid: false, message: licenseExpiryValidation.error }
  }

  const nicValidation = validateSriLankanNic(applicationData.nicId, { required })
  if (nicValidation.error) {
    return { valid: false, message: nicValidation.error }
  }

  return { valid: true }
}

const validateProviderApplicationData = (roleKey, applicationData = {}) => {
  const { fields, documents } = getProviderRequirementConfig(roleKey)
  const missingField = fields.find(({ key }) => !trimValue(applicationData[key], ''))

  if (missingField) {
    return { valid: false, message: `Missing required field: ${missingField.label}` }
  }

  const nextDocuments = applicationData.documents || {}
  const missingDocument = documents.find(({ key }) => !hasDocumentFile(nextDocuments?.[key] || {}))

  if (missingDocument) {
    return { valid: false, message: `Missing required document metadata: ${missingDocument.label}` }
  }

  if (roleKey === 'driver') {
    const driverValidation = validateDriverApplicationStandards(applicationData)
    if (!driverValidation.valid) {
      return driverValidation
    }
  }

  return { valid: true }
}

module.exports = {
  RESTRICTED_PROFILE_FIELDS,
  parseStructuredBody,
  validateDriverApplicationStandards,
  validateProviderApplicationData,
  validateRestrictedProfileFields
}
