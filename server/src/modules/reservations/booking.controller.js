const { sendServerError } = require('../../utils/errorResponses')
const {
  listCustomerBookings,
  createVehicleBooking: createVehicleBookingService,
  createDriverBooking: createDriverBookingService,
  cancelCustomerBooking,
  rejectCustomerPaymentStatusUpdate,
  listDriverBookings,
  updateDriverBookingStatus: updateDriverBookingStatusService,
  listStaffVehicleBookings,
  updateStaffVehicleBookingStatus: updateStaffVehicleBookingStatusService
} = require('./booking.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const getMyBookings = async (req, res) => {
  try {
    const result = await listCustomerBookings({
      customerId: req.user._id,
      ...req.query
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load your bookings')
  }
}

const createVehicleBooking = async (req, res) => {
  try {
    const result = await createVehicleBookingService({
      customer: req.user,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to create vehicle booking')
  }
}

const createDriverBooking = async (req, res) => {
  try {
    const result = await createDriverBookingService({
      customer: req.user,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to create driver booking')
  }
}

const cancelMyBooking = async (req, res) => {
  try {
    const result = await cancelCustomerBooking({
      bookingId: req.params.id,
      customer: req.user
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to cancel booking')
  }
}

const updateMyBookingPayment = async (_req, res) => {
  try {
    return sendServiceError(res, rejectCustomerPaymentStatusUpdate())
  } catch (error) {
    return sendServerError(res, error, 'Failed to update payment status')
  }
}

const getDriverBookings = async (req, res) => {
  try {
    const result = await listDriverBookings({
      driverId: req.user._id,
      ...req.query
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load booking requests')
  }
}

const updateDriverBookingStatus = async (req, res) => {
  try {
    const result = await updateDriverBookingStatusService({
      bookingId: req.params.id,
      driverId: req.user._id,
      bookingStatus: req.body.bookingStatus,
      driverResponseNote: req.body.driverResponseNote
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update booking request')
  }
}

const getStaffVehicleBookings = async (req, res) => {
  try {
    const result = await listStaffVehicleBookings({
      staffId: req.user._id,
      ...req.query
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load vehicle booking requests')
  }
}

const updateStaffVehicleBookingStatus = async (req, res) => {
  try {
    const result = await updateStaffVehicleBookingStatusService({
      bookingId: req.params.id,
      staffId: req.user._id,
      bookingStatus: req.body.bookingStatus
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update vehicle booking')
  }
}

module.exports = {
  getMyBookings,
  createVehicleBooking,
  createDriverBooking,
  cancelMyBooking,
  updateMyBookingPayment,
  getDriverBookings,
  updateDriverBookingStatus,
  getStaffVehicleBookings,
  updateStaffVehicleBookingStatus
}
