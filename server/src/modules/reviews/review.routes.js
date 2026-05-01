const express = require('express')
const {
  createReview,
  getAdminAnalytics,
  getAdminReviews,
  getCustomerDashboard,
  getMyReviewContext,
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
router.get('/dashboard', protect, authorize('customer'), getCustomerDashboard)
router.get('/bookings/:bookingId/context', protect, authorize('customer'), getMyReviewContext)
router.get('/admin', protect, authorize('admin'), getAdminReviews)
router.get('/admin/analytics', protect, authorize('admin'), getAdminAnalytics)
router.patch('/:id/status', protect, authorize('admin'), updateReviewStatus)

module.exports = router
