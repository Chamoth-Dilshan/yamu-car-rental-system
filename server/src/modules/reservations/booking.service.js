const Booking = require('./booking.model')
const DriverAd = require('../drivers/driverAd.model')
const Maintenance = require('../maintenance/maintenance.model')
const Payment = require('../payments/payment.model')
const Vehicle = require('../vehicles/vehicle.model')
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
  serializeBooking
} = require('../../utils/reservationHelpers')
const { validateBookingDateRange } = require('./booking.validation')

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

const reconcileStoredPaymentStatus = async (booking) => {
  if (!booking || !['paid', 'refunded'].includes(booking.paymentStatus)) {
    return
  }

  const paymentExists = await Payment.exists({
    booking: booking._id,
    status: booking.paymentStatus
  })

  if (!paymentExists) {
    booking.paymentStatus = 'pending'
    await booking.save()
  }
}

const listCustomerBookings = async ({
  customerId,
  status,
  paymentStatus,
  search = ''
} = {}) => {
  const query = { customer: customerId }
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

  await Promise.all(bookings.map(reconcileStoredPaymentStatus))

  return {
    bookings: bookings.map(serializeBooking),
    stats: buildStats(bookings)
  }
}

const createVehicleBooking = async ({ customer, body }) => {
  const { vehicleId, pickupLocation = '', destination = '', notes = '', startDate, endDate } = body
  const dateRange = validateBookingDateRange({ startDate, endDate })

  if (dateRange.error) {
    return { error: dateRange.error, statusCode: 400 }
  }

  const vehicle = await Vehicle.findById(vehicleId).populate('owner', 'fullName email phone city profilePic accountStatus roles role staffProfile.storeName')

  if (!vehicle || vehicle.status !== 'available') {
    return { error: 'Selected vehicle is not available for booking', statusCode: 404 }
  }

  const activeMaintenance = await Maintenance.exists({
    vehicle: vehicle._id,
    status: { $in: Maintenance.ACTIVE_MAINTENANCE_STATUSES }
  })

  if (activeMaintenance) {
    return { error: 'Selected vehicle is currently under maintenance', statusCode: 400 }
  }

  if (!vehicle.owner) {
    return { error: 'Selected vehicle is not published by a store yet', statusCode: 400 }
  }

  if (String(vehicle.owner._id) === String(customer._id)) {
    return { error: 'You cannot book your own store vehicle listing', statusCode: 400 }
  }

  const storeRoleAssignment = getRoleAssignment(vehicle.owner, 'staff')
  if (vehicle.owner.accountStatus !== 'active' || !canUseRole(storeRoleAssignment)) {
    return { error: 'Selected vehicle store is not currently available', statusCode: 400 }
  }

  const conflictingBooking = await Booking.findOne(
    buildOverlapQuery({ bookingType: 'vehicle', vehicle: vehicle._id }, dateRange.startDate, dateRange.endDate)
  )

  if (conflictingBooking) {
    return { error: 'The selected vehicle already has an active reservation in that date range', statusCode: 400 }
  }

  const booking = await Booking.create({
    bookingNo: await generateBookingNo('BOOK'),
    bookingType: 'vehicle',
    customer: customer._id,
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
  const customerName = createdBooking.customer?.fullName || customer.fullName

  const notificationTasks = [
    addNotificationToUser(customer._id, {
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

  return {
    message: 'Vehicle booking created successfully',
    booking: serializeBooking(createdBooking)
  }
}

const createDriverBooking = async ({ customer, body }) => {
  const { driverAdId, pickupLocation = '', destination = '', notes = '', startDate, endDate } = body
  const dateRange = validateBookingDateRange({ startDate, endDate })

  if (dateRange.error) {
    return { error: dateRange.error, statusCode: 400 }
  }

  const ad = await DriverAd.findById(driverAdId).populate('driver', 'fullName email phone city profilePic accountStatus roles role')

  if (!ad || ad.visibility !== 'active' || ad.availability === 'unavailable') {
    return { error: 'Selected driver advertisement is not available', statusCode: 404 }
  }

  if (!ad.driver) {
    return { error: 'Selected driver advertisement has no assigned driver', statusCode: 400 }
  }

  if (String(ad.driver._id) === String(customer._id)) {
    return { error: 'You cannot book your own driver advertisement', statusCode: 400 }
  }

  const driverRoleAssignment = getRoleAssignment(ad.driver, 'driver')
  if (ad.driver.accountStatus !== 'active' || !canUseRole(driverRoleAssignment)) {
    return { error: 'Selected driver is not currently available', statusCode: 400 }
  }

  const conflictingBooking = await Booking.findOne(
    buildOverlapQuery({ bookingType: 'driver', driver: ad.driver._id }, dateRange.startDate, dateRange.endDate)
  )

  if (conflictingBooking) {
    return { error: 'This driver already has an active booking in that date range', statusCode: 400 }
  }

  const booking = await Booking.create({
    bookingNo: await generateBookingNo('DRV'),
    bookingType: 'driver',
    customer: customer._id,
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
  const customerName = createdBooking.customer?.fullName || customer.fullName
  const driverName = createdBooking.driver?.fullName || ad.driver?.fullName || 'Driver'

  await Promise.all([
    addNotificationToUser(customer._id, {
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

  return {
    message: 'Driver request sent successfully',
    booking: serializeBooking(createdBooking)
  }
}

const cancelCustomerBooking = async ({ bookingId, customer }) => {
  const booking = await Booking.findOne({ _id: bookingId, customer: customer._id }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Booking not found', statusCode: 404 }
  }

  if (!['pending', 'confirmed'].includes(booking.bookingStatus)) {
    return { error: 'Only pending or confirmed bookings can be cancelled from your account', statusCode: 400 }
  }

  booking.bookingStatus = 'cancelled'
  await booking.save()

  const notificationTasks = [
    addNotificationToUser(customer._id, {
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

  return {
    message: 'Booking cancelled',
    booking: serializeBooking(booking)
  }
}

const rejectCustomerPaymentStatusUpdate = () => ({
  error: 'Please use the payment checkout process to pay for this booking.',
  statusCode: 400
})

const listDriverBookings = async ({ driverId, status, search = '' } = {}) => {
  const query = { bookingType: 'driver', driver: driverId }
  const searchQuery = buildSearchQuery(search)

  if (status && status !== 'all') {
    query.bookingStatus = status
  }

  const bookings = await Booking.find(searchQuery ? { ...query, ...searchQuery } : query)
    .populate(bookingPopulate)
    .sort({ createdAt: -1 })

  await Promise.all(bookings.map(reconcileStoredPaymentStatus))

  return {
    bookings: bookings.map(serializeBooking),
    stats: buildStats(bookings)
  }
}

const updateDriverBookingStatus = async ({
  bookingId,
  driverId,
  bookingStatus,
  driverResponseNote = ''
}) => {
  if (!BOOKING_STATUSES.includes(bookingStatus)) {
    return { error: 'Invalid booking status', statusCode: 400 }
  }

  if (!['confirmed', 'completed', 'cancelled'].includes(bookingStatus)) {
    return { error: 'Only the assigned provider can confirm, complete, or cancel requests', statusCode: 400 }
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    bookingType: 'driver',
    driver: driverId
  }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Booking request not found', statusCode: 404 }
  }

  await reconcileStoredPaymentStatus(booking)

  if (bookingStatus === 'confirmed' && booking.bookingStatus !== 'pending') {
    return { error: 'Only pending driver requests can be confirmed', statusCode: 400 }
  }

  if (bookingStatus === 'completed' && booking.bookingStatus !== 'confirmed') {
    return { error: 'Only confirmed driver requests can be completed', statusCode: 400 }
  }

  if (bookingStatus === 'cancelled' && !['pending', 'confirmed'].includes(booking.bookingStatus)) {
    return { error: 'Only pending or confirmed driver requests can be cancelled', statusCode: 400 }
  }

  booking.bookingStatus = bookingStatus
  booking.driverResponseNote = String(driverResponseNote).trim()
  await booking.save()

  const customerNotification = {
    type: 'booking',
    title: 'Driver updated your trip request',
    message: `Booking ${booking.bookingNo} is now ${bookingStatus}.`,
    link: '/bookings'
  }

  if (bookingStatus === 'confirmed') {
    customerNotification.title = 'Driver request accepted'
    customerNotification.message = 'Your driver request has been accepted. Payment will be available after the trip is completed.'
  }

  if (bookingStatus === 'completed') {
    customerNotification.title = 'Trip completed'
    customerNotification.message = `Booking ${booking.bookingNo} is completed. You can now complete payment.`
  }

  await Promise.all([
    addNotificationToUser(driverId, {
      type: 'booking',
      title: 'Booking request updated',
      message: `You marked booking ${booking.bookingNo} as ${bookingStatus}.`,
      link: '/driver/bookings'
    }),
    addNotificationToUser(booking.customer?._id || booking.customer, customerNotification)
  ])

  return {
    message: 'Booking request updated',
    booking: serializeBooking(booking)
  }
}

const listStaffVehicleBookings = async ({
  staffId,
  status,
  paymentStatus,
  search = ''
} = {}) => {
  const ownedVehicleIds = await Vehicle.find({ owner: staffId }).distinct('_id')
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

  await Promise.all(bookings.map(reconcileStoredPaymentStatus))

  return {
    bookings: bookings.map(serializeBooking),
    stats: buildStats(bookings)
  }
}

const updateStaffVehicleBookingStatus = async ({
  bookingId,
  staffId,
  bookingStatus
}) => {
  if (!BOOKING_STATUSES.includes(bookingStatus)) {
    return { error: 'Invalid booking status', statusCode: 400 }
  }

  if (!['confirmed', 'completed', 'closed', 'cancelled'].includes(bookingStatus)) {
    return { error: 'Stores can only confirm, complete, close, or cancel requests', statusCode: 400 }
  }

  const ownedVehicleIds = await Vehicle.find({ owner: staffId }).distinct('_id')
  const booking = await Booking.findOne({
    _id: bookingId,
    bookingType: 'vehicle',
    vehicle: { $in: ownedVehicleIds }
  }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Vehicle booking not found', statusCode: 404 }
  }

  await reconcileStoredPaymentStatus(booking)

  if (bookingStatus === 'confirmed' && booking.bookingStatus !== 'pending') {
    return { error: 'Only pending vehicle bookings can be confirmed', statusCode: 400 }
  }

  if (bookingStatus === 'completed' && booking.bookingStatus !== 'confirmed') {
    return { error: 'Only confirmed vehicle bookings can be completed', statusCode: 400 }
  }

  if (bookingStatus === 'cancelled' && !['pending', 'confirmed'].includes(booking.bookingStatus)) {
    return { error: 'Only pending or confirmed vehicle bookings can be cancelled', statusCode: 400 }
  }

  if (bookingStatus === 'closed' && !['completed', 'cancelled'].includes(booking.bookingStatus)) {
    return { error: 'Only completed or cancelled vehicle bookings can be closed', statusCode: 400 }
  }

  if (
    bookingStatus === 'closed'
    && booking.bookingStatus === 'completed'
    && booking.paymentStatus !== 'paid'
  ) {
    return { error: 'Completed vehicle bookings can be closed only after payment is paid', statusCode: 400 }
  }

  booking.bookingStatus = bookingStatus
  await booking.save()

  const customerNotification = {
    type: 'booking',
    title: 'Store updated your vehicle booking',
    message: `Booking ${booking.bookingNo} is now ${bookingStatus}.`,
    link: '/bookings'
  }

  if (bookingStatus === 'confirmed') {
    customerNotification.title = 'Reservation accepted'
    customerNotification.message = 'Your reservation has been accepted. Payment will be available after the trip is completed.'
  }

  if (bookingStatus === 'completed') {
    customerNotification.title = 'Trip completed'
    customerNotification.message = `Booking ${booking.bookingNo} is completed. You can now complete payment.`
  }

  await Promise.all([
    addNotificationToUser(staffId, {
      type: 'booking',
      title: 'Vehicle booking updated',
      message: `You marked booking ${booking.bookingNo} as ${bookingStatus}.`,
      link: '/staff/bookings'
    }),
    addNotificationToUser(booking.customer?._id || booking.customer, customerNotification)
  ])

  return {
    message: 'Vehicle booking updated',
    booking: serializeBooking(booking)
  }
}

module.exports = {
  bookingPopulate,
  buildStats,
  generateBookingNo,
  listCustomerBookings,
  createVehicleBooking,
  createDriverBooking,
  cancelCustomerBooking,
  rejectCustomerPaymentStatusUpdate,
  listDriverBookings,
  updateDriverBookingStatus,
  listStaffVehicleBookings,
  updateStaffVehicleBookingStatus
}
