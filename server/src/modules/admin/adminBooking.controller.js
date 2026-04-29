const Booking = require('../reservations/booking.model')
const { sendServerError } = require('../../utils/errorResponses')
const { addNotificationToUser } = require('../../utils/notificationHelpers')
const {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
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

const getAdminBookings = async (req, res) => {
  try {
    const { status, paymentStatus, search = '' } = req.query
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

    res.json({
      bookings: bookings.map(serializeBooking),
      stats: buildStats(bookings)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load bookings for admin')
  }
}

const updateAdminBooking = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus, adminNote = '' } = req.body
    const booking = await Booking.findOne({
      _id: req.params.id,
      bookingType: 'vehicle'
    }).populate(bookingPopulate)

    if (!booking) {
      return res.status(404).json({ message: 'Vehicle booking not found' })
    }

    if (bookingStatus) {
      if (!BOOKING_STATUSES.includes(bookingStatus)) {
        return res.status(400).json({ message: 'Invalid booking status' })
      }

      booking.bookingStatus = bookingStatus
    }

    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' })
      }

      booking.paymentStatus = paymentStatus
    }

    booking.adminNote = String(adminNote).trim()
    await booking.save()

    await Promise.all([
      addNotificationToUser(booking.customer?._id || booking.customer, {
        type: 'booking',
        title: 'Vehicle booking updated',
        message: `Admin updated vehicle booking ${booking.bookingNo}${bookingStatus ? ` to ${bookingStatus}` : ''}.`,
        link: '/bookings'
      }),
      addNotificationToUser(req.user._id, {
        type: 'admin',
        title: 'Vehicle booking action completed',
        message: `You updated vehicle booking ${booking.bookingNo}${bookingStatus ? ` to ${bookingStatus}` : ''}.`,
        link: '/admin/bookings'
      })
    ])

    res.json({
      message: 'Booking updated successfully',
      booking: serializeBooking(booking)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to update booking')
  }
}

const deleteAdminBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      bookingType: 'vehicle'
    })

    if (!booking) {
      return res.status(404).json({ message: 'Vehicle booking not found' })
    }

    await booking.deleteOne()

    await Promise.all([
      addNotificationToUser(booking.customer, {
        type: 'booking',
        title: 'Vehicle booking removed',
        message: `Vehicle booking ${booking.bookingNo} was removed by admin.`,
        link: '/bookings'
      }),
      addNotificationToUser(req.user._id, {
        type: 'admin',
        title: 'Vehicle booking deleted',
        message: `You deleted vehicle booking ${booking.bookingNo}.`,
        link: '/admin/bookings'
      })
    ])

    res.json({ message: 'Booking deleted' })
  } catch (error) {
    sendServerError(res, error, 'Failed to delete booking')
  }
}

module.exports = {
  getAdminBookings,
  updateAdminBooking,
  deleteAdminBooking
}
