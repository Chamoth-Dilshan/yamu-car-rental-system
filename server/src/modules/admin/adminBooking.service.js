const Booking = require('../reservations/booking.model')
const Payment = require('../payments/payment.model')
const { addNotificationToUser } = require('../../utils/notificationHelpers')
const {
  BOOKING_STATUSES,
  serializeBooking
} = require('../../utils/reservationHelpers')

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
  const query = { bookingType: 'vehicle' }

  if (status && status !== 'all') {
    query.bookingStatus = status
  }

  if (paymentStatus && paymentStatus !== 'all') {
    query.paymentStatus = paymentStatus
  }

  if (search) {
    const regex = new RegExp(search, 'i')
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
  const { bookingStatus, adminNote = '' } = body

  if (Object.prototype.hasOwnProperty.call(body, 'paymentStatus')) {
    return {
      error: 'Booking payment status can only be changed through payment verification or refund actions',
      statusCode: 400
    }
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    bookingType: 'vehicle'
  }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Vehicle booking not found', statusCode: 404 }
  }

  await reconcileStoredPaymentStatus(booking)

  if (bookingStatus) {
    if (!BOOKING_STATUSES.includes(bookingStatus)) {
      return { error: 'Invalid booking status', statusCode: 400 }
    }

    if (bookingStatus !== booking.bookingStatus) {
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
    }

    booking.bookingStatus = bookingStatus
  }

  booking.adminNote = String(adminNote).trim()
  await booking.save()

  const customerNotification = {
    type: 'booking',
    title: 'Vehicle booking updated',
    message: `Admin updated vehicle booking ${booking.bookingNo}${bookingStatus ? ` to ${bookingStatus}` : ''}.`,
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
  const booking = await Booking.findOne({
    _id: bookingId,
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
