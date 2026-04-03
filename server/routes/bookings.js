const express = require('express')
const {
  getMyBookings,
  createVehicleBooking,
  createDriverBooking,
  cancelMyBooking,
  updateMyBookingPayment,
  getDriverBookings,
  updateDriverBookingStatus
} = require('../controllers/bookingController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

router.get('/customer', protect, authorize('customer'), getMyBookings)
router.post('/vehicle', protect, authorize('customer'), createVehicleBooking)
router.post('/driver', protect, authorize('customer'), createDriverBooking)
router.put('/:id/cancel', protect, authorize('customer'), cancelMyBooking)
router.put('/:id/payment', protect, authorize('customer'), updateMyBookingPayment)
router.get('/driver/list', protect, authorize('driver'), getDriverBookings)
router.put('/:id/driver-status', protect, authorize('driver'), updateDriverBookingStatus)

module.exports = router
