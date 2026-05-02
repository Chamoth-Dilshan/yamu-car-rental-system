const express = require('express')
const {
  createReview,
  deleteMyReview,
  getDriverAdReviews,
  getAdminAnalytics,
  getAdminReviews,
  getCustomerDashboard,
  getMyReviewContext,
  getMyReviews,
  getVehicleReviews,
  updateMyReview,
  updateReviewStatus
} = require('./review.controller')
const { protect, authorize } = require('../../middleware/auth.middleware')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'reviews',
    message: 'reviews module ready'
  })
})

router.post('/', protect, authorize('customer'), createReview)
router.get('/summary', getCustomerDashboard)
router.get('/dashboard', protect, authorize('customer'), getCustomerDashboard)
router.get('/mine', protect, authorize('customer'), getMyReviews)
router.get('/bookings/:bookingId/context', protect, authorize('customer'), getMyReviewContext)
router.get('/vehicles/:vehicleId', getVehicleReviews)
router.get('/driver-ads/:driverAdId', getDriverAdReviews)
router.get('/admin', protect, authorize('admin'), getAdminReviews)
router.get('/admin/analytics', protect, authorize('admin'), getAdminAnalytics)
router.put('/:id', protect, authorize('customer'), updateMyReview)
router.delete('/:id', protect, authorize('customer'), deleteMyReview)
router.patch('/:id/status', protect, authorize('admin'), updateReviewStatus)

module.exports = router
