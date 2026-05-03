const {
  trimValue,
  validateEmailAddress,
  validateOptionalPhone,
  validatePasswordStrength,
  validateUsernameValue
} = require('../../utils/profileHelpers')

const RESTRICTED_SIGNUP_FIELDS = [
  'role',
  'roles',
  'activeRole',
  'primaryRole',
  'accountStatus',
  'verificationStatus',
  'isSystemAdmin',
  'permissions',
  'emailVerified',
  'authProvider',
  'googleId'
]

const validateRegistrationPayload = (payload = {}) => {
  const restrictedField = RESTRICTED_SIGNUP_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(payload, field))

  if (restrictedField) {
    return { error: 'Role and account status fields cannot be set during registration' }
  }

  const fullName = trimValue(payload.fullName, '')
  if (!fullName) {
    return { error: 'Full name is required' }
  }

  const emailValidation = validateEmailAddress(payload.email)
  if (emailValidation.error) {
    return { error: emailValidation.error }
  }

  const usernameValidation = validateUsernameValue(payload.username)
  if (usernameValidation.error) {
    return { error: usernameValidation.error }
  }

  if (!payload.password) {
    return { error: 'Password is required' }
  }

  const passwordError = validatePasswordStrength(payload.password)
  if (passwordError) {
    return { error: passwordError }
  }

  if (!payload.confirmPassword) {
    return { error: 'Confirm password is required' }
  }

  if (payload.password !== payload.confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const phoneValidation = validateOptionalPhone(payload.phone)
  if (phoneValidation.error) {
    return { error: phoneValidation.error }
  }

  return {
    fullName,
    email: emailValidation.value,
    username: usernameValidation.value,
    password: payload.password,
    phone: phoneValidation.value,
    address: trimValue(payload.address, ''),
    city: trimValue(payload.city, '')
  }
}

const validateLoginPayload = (payload = {}) => {
  const identifier = String(payload.email || '').trim().toLowerCase()

  if (!identifier) {
    return { error: 'Email or username is required' }
  }

  if (!payload.password) {
    return { error: 'Password is required' }
  }

  return {
    identifier,
    password: payload.password
  }
}

const validateGoogleCredentialPayload = (payload = {}) => {
  const credential = String(payload.credential || payload.idToken || '').trim()

  if (!credential) {
    return { error: 'Google credential is required.' }
  }

  return { credential }
}

module.exports = {
  RESTRICTED_SIGNUP_FIELDS,
  validateRegistrationPayload,
  validateLoginPayload,
  validateGoogleCredentialPayload
}
