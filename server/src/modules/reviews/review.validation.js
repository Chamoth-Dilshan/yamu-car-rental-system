const mongoose = require('mongoose')

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const getNumericRating = (value) => {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) && nextValue >= 1 && nextValue <= 5 ? nextValue : null
}

const normalizeReviewStatus = (value) => String(value || '').trim().toLowerCase()

const canReviewBooking = (booking) => {
  return ['completed', 'closed'].includes(booking.bookingStatus)
    && booking.paymentStatus === 'paid'
}

module.exports = {
  isValidObjectId,
  getNumericRating,
  normalizeReviewStatus,
  canReviewBooking
}
