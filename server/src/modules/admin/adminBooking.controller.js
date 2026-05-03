const { sendServerError } = require('../../utils/errorResponses')
const {
  listAdminBookings,
  updateAdminBooking: updateAdminBookingService,
  deleteAdminBooking: deleteAdminBookingService
} = require('./adminBooking.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const getAdminBookings = async (req, res) => {
  try {
    const result = await listAdminBookings(req.query)
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load bookings for admin')
  }
}

const updateAdminBooking = async (req, res) => {
  try {
    const result = await updateAdminBookingService({
      bookingId: req.params.id,
      adminId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update booking')
  }
}

const deleteAdminBooking = async (req, res) => {
  try {
    const result = await deleteAdminBookingService({
      bookingId: req.params.id,
      adminId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json({ message: result.message })
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete booking')
  }
}

module.exports = {
  getAdminBookings,
  updateAdminBooking,
  deleteAdminBooking
}
