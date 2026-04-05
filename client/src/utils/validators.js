const MIN_PASSWORD_LENGTH = 8
const MAX_IMAGE_UPLOADS = 6

export const trimValue = (value = '') => String(value ?? '').trim()

export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimValue(value))

export const isValidPhone = (value = '') => /^[0-9+\-()\s]{7,20}$/.test(trimValue(value))

export const hasDocumentReference = (document = {}) => Boolean(
  trimValue(document.fileName)
  || trimValue(document.filePath)
  || trimValue(document.reference)
)

const formatDateInputValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getTodayDateInputValue = () => formatDateInputValue(new Date())

export const validatePasswordStrength = (password = '') => {
  const value = String(password || '')

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include at least one letter and one number'
  }

  return ''
}

const validateDateRange = (startDate, endDate, { allowPastStart = false } = {}) => {
  if (!trimValue(startDate)) {
    return 'Start date is required'
  }

  if (!trimValue(endDate)) {
    return 'End date is required'
  }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Please select valid dates'
  }

  if (!allowPastStart) {
    const today = new Date(`${getTodayDateInputValue()}T00:00:00`)

    if (start < today) {
      return 'Start date cannot be in the past'
    }
  }

  if (end < start) {
    return 'End date must be the same day or after the start date'
  }

  return ''
}

const validateImageFiles = (files = []) => {
  if ((files || []).length > MAX_IMAGE_UPLOADS) {
    return `You can upload up to ${MAX_IMAGE_UPLOADS} images only`
  }

  const invalidFile = (files || []).find((file) => file && !String(file.type || '').startsWith('image/'))

  if (invalidFile) {
    return 'Only image files are allowed'
  }

  return ''
}

export const validateSignInForm = ({ email = '', password = '' }) => {
  if (!trimValue(email)) {
    return 'Email or username is required'
  }

  if (!String(password || '')) {
    return 'Password is required'
  }

  return ''
}

export const validateSignUpForm = ({
  fullName = '',
  username = '',
  email = '',
  password = '',
  confirmPassword = ''
}) => {
  if (!trimValue(fullName)) {
    return 'Full name is required'
  }

  if (trimValue(fullName).length < 3) {
    return 'Full name must be at least 3 characters long'
  }

  if (trimValue(username) && trimValue(username).length < 3) {
    return 'Username must be at least 3 characters long'
  }

  if (!trimValue(email)) {
    return 'Email is required'
  }

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address'
  }

  const passwordError = validatePasswordStrength(password)
  if (passwordError) {
    return passwordError
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match'
  }

  return ''
}

export const validateReservationForm = ({ startDate = '', endDate = '' }) => (
  validateDateRange(startDate, endDate)
)

export const validateVehicleListingForm = (
  form,
  { isEditMode = false, currentImages = [], imageFiles = [] } = {}
) => {
  if (!trimValue(form.name)) {
    return 'Vehicle name is required'
  }

  if (!trimValue(form.brand)) {
    return 'Brand is required'
  }

  if (!trimValue(form.model)) {
    return 'Model is required'
  }

  const year = Number(form.year)
  const currentYear = new Date().getFullYear() + 1
  if (!Number.isFinite(year) || year < 1900 || year > currentYear) {
    return 'Please enter a valid vehicle year'
  }

  if (!trimValue(form.fuelType)) {
    return 'Fuel type is required'
  }

  if (!trimValue(form.transmission)) {
    return 'Transmission is required'
  }

  const seats = Number(form.seats)
  if (!Number.isFinite(seats) || seats < 1) {
    return 'Seat count must be at least 1'
  }

  if (!trimValue(form.location)) {
    return 'Location is required'
  }

  const pricePerDay = Number(form.pricePerDay)
  if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
    return 'Price per day must be greater than zero'
  }

  const imageError = validateImageFiles(imageFiles)
  if (imageError) {
    return imageError
  }

  if (!isEditMode && !(currentImages || []).length && !(imageFiles || []).length) {
    return 'At least one vehicle image is required'
  }

  return ''
}

export const validateDriverAdInput = (form, { photoFile = null } = {}) => {
  if (!trimValue(form.title)) {
    return 'Advertisement title is required'
  }

  if (!trimValue(form.serviceLocation)) {
    return 'Service location is required'
  }

  const dailyRate = Number(form.dailyRate)
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    return 'Daily rate must be greater than zero'
  }

  if (trimValue(form.experienceYears)) {
    const experienceYears = Number(form.experienceYears)
    if (!Number.isFinite(experienceYears) || experienceYears < 0) {
      return 'Experience years cannot be negative'
    }
  }

  if (trimValue(form.maxGroupSize)) {
    const maxGroupSize = Number(form.maxGroupSize)
    if (!Number.isFinite(maxGroupSize) || maxGroupSize < 1) {
      return 'Max group size must be at least 1'
    }
  }

  if (photoFile && !String(photoFile.type || '').startsWith('image/')) {
    return 'Driver photo must be an image file'
  }

  return ''
}

export const validateBasicProfileForm = (profile) => {
  if (!trimValue(profile.fullName)) {
    return 'Full name is required'
  }

  if (!trimValue(profile.username)) {
    return 'Username is required'
  }

  if (!trimValue(profile.email)) {
    return 'Email is required'
  }

  if (!isValidEmail(profile.email)) {
    return 'Please enter a valid email address'
  }

  if (trimValue(profile.phone) && !isValidPhone(profile.phone)) {
    return 'Please enter a valid phone number'
  }

  const emergencyContactFields = [
    trimValue(profile.emergencyContactName),
    trimValue(profile.emergencyContactPhone),
    trimValue(profile.emergencyContactRelationship)
  ]
  const emergencyContactCompleted = emergencyContactFields.filter(Boolean).length

  if (emergencyContactCompleted > 0 && emergencyContactCompleted < emergencyContactFields.length) {
    return 'Complete all emergency contact fields or leave them blank'
  }

  if (trimValue(profile.emergencyContactPhone) && !isValidPhone(profile.emergencyContactPhone)) {
    return 'Please enter a valid emergency contact phone number'
  }

  if (profile.password) {
    if (!profile.currentPassword) {
      return 'Current password is required to set a new password'
    }

    const passwordError = validatePasswordStrength(profile.password)
    if (passwordError) {
      return passwordError
    }
  }

  return ''
}

export const validateDriverApplicationPayload = (profile) => {
  if (!trimValue(profile.drivingLicenseNumber)) {
    return 'Driving license number is required'
  }

  if (!trimValue(profile.nicId)) {
    return 'NIC / ID is required'
  }

  if (!trimValue(profile.serviceArea)) {
    return 'Service area is required'
  }

  if (!hasDocumentReference(profile.documents?.nicDocument)) {
    return 'NIC / ID document details are required'
  }

  if (!hasDocumentReference(profile.documents?.drivingLicenseDocument)) {
    return 'Driving license document details are required'
  }

  if (!hasDocumentReference(profile.documents?.proofOfAddressDocument)) {
    return 'Proof of address document details are required'
  }

  return ''
}

export const validateStaffApplicationPayload = (profile) => {
  if (!trimValue(profile.storeName)) {
    return 'Store name is required'
  }

  if (!trimValue(profile.businessRegistrationNumber)) {
    return 'Business registration number is required'
  }

  if (!trimValue(profile.storeAddress)) {
    return 'Store address is required'
  }

  if (!trimValue(profile.storeContactNumber)) {
    return 'Store contact number is required'
  }

  if (!isValidPhone(profile.storeContactNumber)) {
    return 'Please enter a valid store contact number'
  }

  if (!trimValue(profile.storeEmail)) {
    return 'Store email is required'
  }

  if (!isValidEmail(profile.storeEmail)) {
    return 'Please enter a valid store email address'
  }

  if (!hasDocumentReference(profile.documents?.businessRegistrationDocument)) {
    return 'Business registration document details are required'
  }

  if (!hasDocumentReference(profile.documents?.proofOfAddressDocument)) {
    return 'Proof of address document details are required'
  }

  return ''
}
