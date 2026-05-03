const { validateDateRange } = require('../../utils/reservationHelpers')

const validateBookingDateRange = ({ startDate, endDate } = {}) => (
  validateDateRange(startDate, endDate)
)

module.exports = {
  validateBookingDateRange
}
