const Booking = require('../reservations/booking.model')
const Payment = require('../payments/payment.model')
const { addNotificationToUser } = require('../../utils/notificationHelpers')
const { serializeBooking } = require('../../utils/reservationHelpers')
const {
  escapeRegex,
  trimValue,
  validateBookingId,
  validateBookingStatusPayload,
  validateListQuery
} = require('../reservations/booking.validation')

const bookingPopulate = [
  { path: 'customer', select: 'fullName email phone city profilePic' },
  { path: 'driver', select: 'fullName email phone city profilePic' },
  { path: 'vehicle' },
  {
    path: 'driverAd',
    populate: {
      path: 'driver',
      select: 'fullName email phone city profilePic'
    }
  }
]

const ADMIN_BOOKING_STATUS_ACTIONS = ['cancelled', 'closed']

const buildStats = (bookings) => ({
  totalBookings: bookings.length,
  pendingCount: bookings.filter((booking) => booking.bookingStatus === 'pending').length,
  confirmedCount: bookings.filter((booking) => booking.bookingStatus === 'confirmed').length,
  completedCount: bookings.filter((booking) => booking.bookingStatus === 'completed').length,
  cancelledCount: bookings.filter((booking) => booking.bookingStatus === 'cancelled').length,
  closedCount: bookings.filter((booking) => booking.bookingStatus === 'closed').length
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

const listAdminBookings = async ({ status, paymentStatus, search = '' } = {}) => {
  const validatedQuery = validateListQuery({ status, paymentStatus, search }, { allowPaymentStatus: true })
  if (validatedQuery.error) {
    return { error: validatedQuery.error, statusCode: 400 }
  }

  const query = { bookingType: 'vehicle' }

  if (validatedQuery.status) {
    query.bookingStatus = validatedQuery.status
  }

  if (validatedQuery.paymentStatus) {
    query.paymentStatus = validatedQuery.paymentStatus
  }

  if (validatedQuery.search) {
    const regex = new RegExp(escapeRegex(validatedQuery.search), 'i')
    query.$or = [
      { bookingNo: regex },
      { serviceTitle: regex },
      { vehicleLabel: regex },
      { pickupLocation: regex },
      { destination: regex }
    ]
  }

  const bookings = await Booking.find(query)
    .populate(bookingPopulate)
    .sort({ createdAt: -1 })

  await Promise.all(bookings.map(reconcileStoredPaymentStatus))

  return {
    bookings: bookings.map(serializeBooking),
    stats: buildStats(bookings)
  }
}

const updateAdminBooking = async ({ bookingId, adminId, body }) => {
  const bookingIdValidation = validateBookingId(bookingId)
  if (bookingIdValidation.error) {
    return { error: bookingIdValidation.error, statusCode: 400 }
  }

  const hasStatusField = (
    Object.prototype.hasOwnProperty.call(body, 'bookingStatus')
    || Object.prototype.hasOwnProperty.call(body, 'status')
  )
  const statusValidation = hasStatusField ? validateBookingStatusPayload(body) : null

  if (statusValidation?.error) {
    return { error: statusValidation.error, statusCode: 400 }
  }

  const bookingStatus = statusValidation?.bookingStatus
  const adminNote = trimValue(body.adminNote || body.note)

  if (Object.prototype.hasOwnProperty.call(body, 'paymentStatus')) {
    return {
      error: 'Booking payment status can only be changed through payment verification or refund actions',
      statusCode: 400
    }
  }

  const booking = await Booking.findOne({
    _id: bookingIdValidation.value,
    bookingType: 'vehicle'
  }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Vehicle booking not found', statusCode: 404 }
  }

  await reconcileStoredPaymentStatus(booking)

  if (bookingStatus) {
    if (!ADMIN_BOOKING_STATUS_ACTIONS.includes(bookingStatus)) {
      return { error: 'Admin can only cancel or close vehicle bookings. Stores confirm and complete them.', statusCode: 403 }
    }

    if (bookingStatus !== booking.bookingStatus) {
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
    }

    booking.bookingStatus = bookingStatus
  }

  booking.adminNote = adminNote
  await booking.save()

  const customerNotification = {
    type: 'booking',
    title: 'Vehicle booking updated',
    message: `Admin updated vehicle booking ${booking.bookingNo}${bookingStatus ? ` to ${bookingStatus}` : ''}.`,
    link: '/bookings'
  }

  await Promise.all([
    addNotificationToUser(booking.customer?._id || booking.customer, customerNotification),
    addNotificationToUser(adminId, {
      type: 'admin',
      title: 'Vehicle booking action completed',
      message: `You updated vehicle booking ${booking.bookingNo}${bookingStatus ? ` to ${bookingStatus}` : ''}.`,
      link: '/admin/bookings'
    })
  ])

  return {
    message: 'Booking updated successfully',
    booking: serializeBooking(booking)
  }
}

const deleteAdminBooking = async ({ bookingId, adminId }) => {
  const bookingIdValidation = validateBookingId(bookingId)
  if (bookingIdValidation.error) {
    return { error: bookingIdValidation.error, statusCode: 400 }
  }

  const booking = await Booking.findOne({
    _id: bookingIdValidation.value,
    bookingType: 'vehicle'
  })

  if (!booking) {
    return { error: 'Vehicle booking not found', statusCode: 404 }
  }

  await booking.deleteOne()

  await Promise.all([
    addNotificationToUser(booking.customer, {
      type: 'booking',
      title: 'Vehicle booking removed',
      message: `Vehicle booking ${booking.bookingNo} was removed by admin.`,
      link: '/bookings'
    }),
    addNotificationToUser(adminId, {
      type: 'admin',
      title: 'Vehicle booking deleted',
      message: `You deleted vehicle booking ${booking.bookingNo}.`,
      link: '/admin/bookings'
    })
  ])

  return { message: 'Booking deleted' }
}

module.exports = {
  listAdminBookings,
  updateAdminBooking,
  deleteAdminBooking
}
