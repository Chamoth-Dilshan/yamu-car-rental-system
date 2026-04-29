const Booking = require('./booking.model')
const DriverAd = require('../drivers/driverAd.model')
const Vehicle = require('../vehicles/vehicle.model')
const { sendServerError } = require('../../utils/errorResponses')
const {
  addNotificationToAdmins,
  addNotificationToUser
} = require('../../utils/notificationHelpers')
const {
  canUseRole,
  getRoleAssignment
} = require('../../utils/roleHelpers')
const {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  serializeBooking,
  validateDateRange
} = require('../../utils/reservationHelpers')

const bookingPopulate = [
  { path: 'customer', select: 'fullName email phone city profilePic' },
  { path: 'driver', select: 'fullName email phone city profilePic' },
  {
    path: 'vehicle',
    populate: {
      path: 'owner',
      select: 'fullName email phone city profilePic staffProfile.storeName'
    }
  },
  {
    path: 'driverAd',
    populate: {
      path: 'driver',
      select: 'fullName email phone city profilePic'
    }
  }
]

const buildStats = (bookings) => ({
  totalBookings: bookings.length,
  pendingCount: bookings.filter((booking) => booking.bookingStatus === 'pending').length,
  confirmedCount: bookings.filter((booking) => booking.bookingStatus === 'confirmed').length,
  completedCount: bookings.filter((booking) => booking.bookingStatus === 'completed').length,
  cancelledCount: bookings.filter((booking) => booking.bookingStatus === 'cancelled').length,
  closedCount: bookings.filter((booking) => booking.bookingStatus === 'closed').length,
  paidCount: bookings.filter((booking) => booking.paymentStatus === 'paid').length
})

const generateBookingNo = async (prefix) => {
  let bookingNo = ''

  do {
    bookingNo = `${prefix}${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`
  } while (await Booking.exists({ bookingNo }))

  return bookingNo
}

const buildSearchQuery = (search) => {
  if (!search) {
    return null
  }

  const regex = new RegExp(search, 'i')

  return {
    $or: [
      { bookingNo: regex },
      { serviceTitle: regex },
      { vehicleLabel: regex },
      { pickupLocation: regex },
      { destination: regex }
    ]
  }
}

const buildOverlapQuery = (resourceQuery, startDate, endDate) => ({
  ...resourceQuery,
  bookingStatus: { $in: ['pending', 'confirmed'] },
  startDate: { $lte: endDate },
  endDate: { $gte: startDate }
})

const getMyBookings = async (req, res) => {
  try {
    const { status, paymentStatus, search = '' } = req.query
    const query = { customer: req.user._id }
    const searchQuery = buildSearchQuery(search)

    if (status && status !== 'all') {
      query.bookingStatus = status
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus
    }

    const bookings = await Booking.find(searchQuery ? { ...query, ...searchQuery } : query)
      .populate(bookingPopulate)
      .sort({ startDate: -1, createdAt: -1 })

    res.json({
      bookings: bookings.map(serializeBooking),
      stats: buildStats(bookings)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load your bookings')
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

    await Promise.all(notificationTasks)

    res.status(201).json({
      message: 'Vehicle booking created successfully',
      booking: serializeBooking(createdBooking)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to create vehicle booking')
  }
}

const createDriverBooking = async (req, res) => {
  try {
    const { driverAdId, pickupLocation = '', destination = '', notes = '', startDate, endDate } = req.body
    const dateRange = validateDateRange(startDate, endDate)

    if (dateRange.error) {
      return res.status(400).json({ message: dateRange.error })
    }

    const ad = await DriverAd.findById(driverAdId).populate('driver', 'fullName email phone city profilePic accountStatus roles role')

    if (!ad || ad.visibility !== 'active' || ad.availability === 'unavailable') {
      return res.status(404).json({ message: 'Selected driver advertisement is not available' })
    }

    if (!ad.driver) {
      return res.status(400).json({ message: 'Selected driver advertisement has no assigned driver' })
    }

    if (String(ad.driver._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot book your own driver advertisement' })
    }

    const driverRoleAssignment = getRoleAssignment(ad.driver, 'driver')
    if (ad.driver.accountStatus !== 'active' || !canUseRole(driverRoleAssignment)) {
      return res.status(400).json({ message: 'Selected driver is not currently available' })
    }

    const conflictingBooking = await Booking.findOne(
      buildOverlapQuery({ bookingType: 'driver', driver: ad.driver._id }, dateRange.startDate, dateRange.endDate)
    )

    if (conflictingBooking) {
      return res.status(400).json({ message: 'This driver already has an active booking in that date range' })
    }

    const booking = await Booking.create({
      bookingNo: await generateBookingNo('DRV'),
      bookingType: 'driver',
      customer: req.user._id,
      driver: ad.driver._id,
      driverAd: ad._id,
      serviceTitle: ad.title,
      vehicleLabel: ad.title,
      pickupLocation: String(pickupLocation).trim(),
      destination: String(destination).trim(),
      notes: String(notes).trim(),
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dailyRate: ad.dailyRate,
      billableDays: dateRange.billableDays,
      baseAmount: ad.dailyRate * dateRange.billableDays,
      serviceFee: 0,
      totalAmount: ad.dailyRate * dateRange.billableDays
    })

    const createdBooking = await Booking.findById(booking._id).populate(bookingPopulate)
    const customerName = createdBooking.customer?.fullName || req.user.fullName
    const driverName = createdBooking.driver?.fullName || ad.driver?.fullName || 'Driver'

    await Promise.all([
      addNotificationToUser(req.user._id, {
        type: 'booking',
        title: 'Driver request sent',
        message: `Your request ${booking.bookingNo} was sent to ${driverName}.`,
        link: '/bookings'
      }),
      addNotificationToUser(ad.driver._id, {
        type: 'booking',
        title: 'New booking request',
        message: `${customerName} sent a new trip request (${booking.bookingNo}).`,
        link: '/driver/bookings'
      })
    ])

    res.status(201).json({
      message: 'Driver request sent successfully',
      booking: serializeBooking(createdBooking)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to create driver booking')
  }
}

const cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id }).populate(bookingPopulate)

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    if (!['pending', 'confirmed'].includes(booking.bookingStatus)) {
      return res.status(400).json({ message: 'Only pending or confirmed bookings can be cancelled from your account' })
    }

    booking.bookingStatus = 'cancelled'
    await booking.save()

    const notificationTasks = [
      addNotificationToUser(req.user._id, {
        type: 'booking',
        title: 'Booking cancelled',
        message: `Booking ${booking.bookingNo} has been cancelled.`,
        link: '/bookings'
      })
    ]

    if (booking.bookingType === 'driver' && booking.driver) {
      notificationTasks.push(addNotificationToUser(booking.driver._id, {
        type: 'booking',
        title: 'Driver request cancelled',
        message: `Customer cancelled trip request ${booking.bookingNo}.`,
        link: '/driver/bookings'
      }))
    }

    if (booking.bookingType === 'vehicle') {
      if (booking.vehicle?.owner?._id || booking.vehicle?.owner) {
        notificationTasks.push(addNotificationToUser(booking.vehicle.owner._id || booking.vehicle.owner, {
          type: 'booking',
          title: 'Vehicle booking cancelled',
          message: `Customer cancelled vehicle booking ${booking.bookingNo}.`,
          link: '/staff/bookings'
        }))
      }

      notificationTasks.push(addNotificationToAdmins({
        type: 'booking',
        title: 'Vehicle booking cancelled',
        message: `Customer cancelled vehicle booking ${booking.bookingNo}.`,
        link: '/admin/bookings'
      }))
    }

    await Promise.all(notificationTasks)

    res.json({
      message: 'Booking cancelled',
      booking: serializeBooking(booking)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to cancel booking')
  }
}

const updateMyBookingPayment = async (req, res) => {
  try {
    const { paymentStatus } = req.body

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' })
    }

    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id }).populate(bookingPopulate)

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled bookings cannot update payment state here' })
    }

    booking.paymentStatus = paymentStatus
    await booking.save()

    const notificationTasks = [
      addNotificationToUser(req.user._id, {
        type: 'payment',
        title: 'Payment status updated',
        message: `Booking ${booking.bookingNo} payment is now marked as ${paymentStatus}.`,
        link: '/bookings'
      })
    ]

    if (booking.bookingType === 'vehicle') {
      if (booking.vehicle?.owner?._id || booking.vehicle?.owner) {
        notificationTasks.push(addNotificationToUser(booking.vehicle.owner._id || booking.vehicle.owner, {
          type: 'payment',
          title: 'Vehicle booking payment updated',
          message: `Booking ${booking.bookingNo} payment was marked as ${paymentStatus}.`,
          link: '/staff/bookings'
        }))
      }

      notificationTasks.push(addNotificationToAdmins({
        type: 'payment',
        title: 'Vehicle booking payment updated',
        message: `Booking ${booking.bookingNo} payment was marked as ${paymentStatus}.`,
        link: '/admin/bookings'
      }))
    }

    if (booking.bookingType === 'driver' && booking.driver) {
      notificationTasks.push(addNotificationToUser(booking.driver._id, {
        type: 'payment',
        title: 'Trip payment updated',
        message: `Booking ${booking.bookingNo} payment was marked as ${paymentStatus}.`,
        link: '/driver/bookings'
      }))
    }

    await Promise.all(notificationTasks)

    res.json({
      message: 'Payment status updated',
      booking: serializeBooking(booking)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to update payment status')
  }
}

const getDriverBookings = async (req, res) => {
  try {
    const { status, search = '' } = req.query
    const query = { bookingType: 'driver', driver: req.user._id }
    const searchQuery = buildSearchQuery(search)

    if (status && status !== 'all') {
      query.bookingStatus = status
    }

    const bookings = await Booking.find(searchQuery ? { ...query, ...searchQuery } : query)
      .populate(bookingPopulate)
      .sort({ createdAt: -1 })

    res.json({
      bookings: bookings.map(serializeBooking),
      stats: buildStats(bookings)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load booking requests')
  }
}

const updateDriverBookingStatus = async (req, res) => {
  try {
    const { bookingStatus, driverResponseNote = '' } = req.body

    if (!BOOKING_STATUSES.includes(bookingStatus)) {
      return res.status(400).json({ message: 'Invalid booking status' })
    }

    if (!['confirmed', 'completed', 'cancelled'].includes(bookingStatus)) {
      return res.status(400).json({ message: 'Only the assigned provider can confirm, complete, or cancel requests' })
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      bookingType: 'driver',
      driver: req.user._id
    }).populate(bookingPopulate)

    if (!booking) {
      return res.status(404).json({ message: 'Booking request not found' })
    }

    booking.bookingStatus = bookingStatus
    booking.driverResponseNote = String(driverResponseNote).trim()
    await booking.save()

    await Promise.all([
      addNotificationToUser(req.user._id, {
        type: 'booking',
        title: 'Booking request updated',
        message: `You marked booking ${booking.bookingNo} as ${bookingStatus}.`,
        link: '/driver/bookings'
      }),
      addNotificationToUser(booking.customer?._id || booking.customer, {
        type: 'booking',
        title: 'Driver updated your trip request',
        message: `Booking ${booking.bookingNo} is now ${bookingStatus}.`,
        link: '/bookings'
      })
    ])

    res.json({
      message: 'Booking request updated',
      booking: serializeBooking(booking)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to update booking request')
  }
}

const getStaffVehicleBookings = async (req, res) => {
  try {
    const { status, paymentStatus, search = '' } = req.query
    const ownedVehicleIds = await Vehicle.find({ owner: req.user._id }).distinct('_id')
    const query = {
      bookingType: 'vehicle',
      vehicle: { $in: ownedVehicleIds }
    }
    const searchQuery = buildSearchQuery(search)

    if (status && status !== 'all') {
      query.bookingStatus = status
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus
    }

    const bookings = await Booking.find(searchQuery ? { ...query, ...searchQuery } : query)
      .populate(bookingPopulate)
      .sort({ createdAt: -1 })

    res.json({
      bookings: bookings.map(serializeBooking),
      stats: buildStats(bookings)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load vehicle booking requests')
  }
}

const updateStaffVehicleBookingStatus = async (req, res) => {
  try {
    const { bookingStatus } = req.body

    if (!BOOKING_STATUSES.includes(bookingStatus)) {
      return res.status(400).json({ message: 'Invalid booking status' })
    }

    if (!['confirmed', 'completed', 'closed', 'cancelled'].includes(bookingStatus)) {
      return res.status(400).json({ message: 'Stores can only confirm, complete, close, or cancel requests' })
    }

    const ownedVehicleIds = await Vehicle.find({ owner: req.user._id }).distinct('_id')
    const booking = await Booking.findOne({
      _id: req.params.id,
      bookingType: 'vehicle',
      vehicle: { $in: ownedVehicleIds }
    }).populate(bookingPopulate)

    if (!booking) {
      return res.status(404).json({ message: 'Vehicle booking not found' })
    }

    booking.bookingStatus = bookingStatus
    await booking.save()

    await Promise.all([
      addNotificationToUser(req.user._id, {
        type: 'booking',
        title: 'Vehicle booking updated',
        message: `You marked booking ${booking.bookingNo} as ${bookingStatus}.`,
        link: '/staff/bookings'
      }),
      addNotificationToUser(booking.customer?._id || booking.customer, {
        type: 'booking',
        title: 'Store updated your vehicle booking',
        message: `Booking ${booking.bookingNo} is now ${bookingStatus}.`,
        link: '/bookings'
      })
    ])

    res.json({
      message: 'Vehicle booking updated',
      booking: serializeBooking(booking)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to update vehicle booking')
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
