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

module.exports = {
  RESTRICTED_PROFILE_FIELDS,
  parseStructuredBody,
  validateRestrictedProfileFields
}
