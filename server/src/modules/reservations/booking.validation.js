const mongoose = require('mongoose')
const {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  validateDateRange
} = require('../../utils/reservationHelpers')

const MAX_LOCATION_LENGTH = 160
const MAX_NOTES_LENGTH = 1000
const MAX_SEARCH_LENGTH = 100

const trimValue = (value = '') => String(value || '').trim()

const escapeRegex = (value = '') => trimValue(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeBookingStatus = (value = '') => {
  const normalizedValue = trimValue(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  const aliases = {
    canceled: 'cancelled'
  }

  return aliases[normalizedValue] || normalizedValue
}

const isValidObjectId = (value) => mongoose.isValidObjectId(value)

const validateObjectId = (value, label) => {
  const id = trimValue(value)

  if (!id) {
    return { error: `${label} is required` }
  }

  if (!isValidObjectId(id)) {
    return { error: `Invalid ${label.toLowerCase()}` }
  }

  return { value: id }
}

const validateTextField = (value, label, maxLength) => {
  const text = trimValue(value)

  if (text.length > maxLength) {
    return { error: `${label} must be ${maxLength} characters or fewer` }
  }

  return { value: text }
}

const validateBookingDateRange = ({ startDate, endDate } = {}) => (
  validateDateRange(startDate, endDate)
)

const validateBookingDetails = (body = {}) => {
  const pickupLocation = validateTextField(body.pickupLocation, 'Pickup location', MAX_LOCATION_LENGTH)
  if (pickupLocation.error) {
    return pickupLocation
  }

  const destination = validateTextField(body.destination, 'Destination', MAX_LOCATION_LENGTH)
  if (destination.error) {
    return destination
  }

  const notes = validateTextField(body.notes, 'Notes', MAX_NOTES_LENGTH)
  if (notes.error) {
    return notes
  }

  const dateRange = validateBookingDateRange({
    startDate: body.startDate,
    endDate: body.endDate
  })

  if (dateRange.error) {
    return dateRange
  }

  return {
    pickupLocation: pickupLocation.value,
    destination: destination.value,
    notes: notes.value,
    dateRange
  }
}

const validateVehicleBookingPayload = (body = {}) => {
  const vehicleId = validateObjectId(body.vehicleId || body.vehicle, 'Vehicle ID')
  if (vehicleId.error) {
    return vehicleId
  }

  const details = validateBookingDetails(body)
  if (details.error) {
    return details
  }

  return {
    vehicleId: vehicleId.value,
    ...details
  }
}

const validateDriverBookingPayload = (body = {}) => {
  const driverAdId = validateObjectId(body.driverAdId || body.driverAd, 'Driver advertisement ID')
  if (driverAdId.error) {
    return driverAdId
  }

  const details = validateBookingDetails(body)
  if (details.error) {
    return details
  }

  return {
    driverAdId: driverAdId.value,
    ...details
  }
}

const validateBookingId = (bookingId) => validateObjectId(bookingId, 'Booking ID')

const validateListQuery = ({ status, paymentStatus, search = '' } = {}, { allowPaymentStatus = false } = {}) => {
  const query = {
    search: trimValue(search).slice(0, MAX_SEARCH_LENGTH)
  }
  const requestedStatus = trimValue(status).toLowerCase()
  const requestedPaymentStatus = trimValue(paymentStatus).toLowerCase()

  if (requestedStatus && requestedStatus !== 'all') {
    const bookingStatus = normalizeBookingStatus(requestedStatus)

    if (!BOOKING_STATUSES.includes(bookingStatus)) {
      return { error: 'Invalid booking status' }
    }

    query.status = bookingStatus
  }

  if (allowPaymentStatus && requestedPaymentStatus && requestedPaymentStatus !== 'all') {
    if (!PAYMENT_STATUSES.includes(requestedPaymentStatus)) {
      return { error: 'Invalid payment status' }
    }

    query.paymentStatus = requestedPaymentStatus
  }

  return query
}

const validateBookingStatusPayload = (body = {}, allowedStatuses = []) => {
  const bookingStatus = normalizeBookingStatus(body.bookingStatus || body.status)

  if (!bookingStatus) {
    return { error: 'Booking status is required' }
  }

  if (!BOOKING_STATUSES.includes(bookingStatus)) {
    return { error: 'Invalid booking status' }
  }

  if (allowedStatuses.length && !allowedStatuses.includes(bookingStatus)) {
    return { error: 'Booking status is not allowed for this action' }
  }

  const driverResponseNote = validateTextField(body.driverResponseNote, 'Driver response note', MAX_NOTES_LENGTH)
  if (driverResponseNote.error) {
    return driverResponseNote
  }

  return {
    bookingStatus,
    driverResponseNote: driverResponseNote.value
  }
}

module.exports = {
  escapeRegex,
  isValidObjectId,
  normalizeBookingStatus,
  trimValue,
  validateBookingDateRange,
  validateBookingId,
  validateBookingStatusPayload,
  validateDriverBookingPayload,
  validateListQuery,
  validateVehicleBookingPayload
}
