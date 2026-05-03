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

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load your bookings')
  }
}

const createVehicleBooking = async (req, res) => {
  try {
    const { vehicleId, pickupLocation = '', destination = '', notes = '', startDate, endDate } = req.body
    const dateRange = validateDateRange(startDate, endDate)

    if (dateRange.error) {
      return res.status(400).json({ message: dateRange.error })
    }

    const vehicle = await Vehicle.findById(vehicleId).populate('owner', 'fullName email phone city profilePic accountStatus roles role staffProfile.storeName')

    if (!vehicle || vehicle.status !== 'available') {
      return res.status(404).json({ message: 'Selected vehicle is not available for booking' })
    }

    const activeMaintenance = await Maintenance.exists({
      vehicle: vehicle._id,
      status: { $in: Maintenance.ACTIVE_MAINTENANCE_STATUSES }
    })

    if (activeMaintenance) {
      return res.status(400).json({ message: 'Selected vehicle is currently under maintenance' })
    }

    if (!vehicle.owner) {
      return res.status(400).json({ message: 'Selected vehicle is not published by a store yet' })
    }

    if (String(vehicle.owner._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot book your own store vehicle listing' })
    }

    const storeRoleAssignment = getRoleAssignment(vehicle.owner, 'staff')
    if (vehicle.owner.accountStatus !== 'active' || !canUseRole(storeRoleAssignment)) {
      return res.status(400).json({ message: 'Selected vehicle store is not currently available' })
    }

    const conflictingBooking = await Booking.findOne(
      buildOverlapQuery({ bookingType: 'vehicle', vehicle: vehicle._id }, dateRange.startDate, dateRange.endDate)
    )

    if (conflictingBooking) {
      return res.status(400).json({ message: 'The selected vehicle already has an active reservation in that date range' })
    }

    const booking = await Booking.create({
      bookingNo: await generateBookingNo('BOOK'),
      bookingType: 'vehicle',
      customer: req.user._id,
      vehicle: vehicle._id,
      serviceTitle: vehicle.name,
      vehicleLabel: vehicle.name,
      pickupLocation: String(pickupLocation).trim(),
      destination: String(destination).trim(),
      notes: String(notes).trim(),
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dailyRate: vehicle.pricePerDay,
      billableDays: dateRange.billableDays,
      baseAmount: vehicle.pricePerDay * dateRange.billableDays,
      serviceFee: 0,
      totalAmount: vehicle.pricePerDay * dateRange.billableDays
    })

    const createdBooking = await Booking.findById(booking._id).populate(bookingPopulate)
    const customerName = createdBooking.customer?.fullName || req.user.fullName

    const notificationTasks = [
      addNotificationToUser(req.user._id, {
        type: 'booking',
        title: 'Vehicle booking created',
        message: `${vehicle.name} reservation ${booking.bookingNo} was created and is pending review.`,
        link: '/bookings'
      }),
      addNotificationToAdmins({
        type: 'booking',
        title: 'New vehicle booking',
        message: `${customerName} created vehicle booking ${booking.bookingNo} for ${vehicle.name}.`,
        link: '/admin/bookings'
      })
    ]

    if (vehicle.owner) {
      notificationTasks.push(addNotificationToUser(vehicle.owner, {
        type: 'booking',
        title: 'New vehicle booking request',
        message: `${customerName} created booking ${booking.bookingNo} for ${vehicle.name}.`,
        link: '/staff/bookings'
      }))
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
