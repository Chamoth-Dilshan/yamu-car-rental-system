const express = require('express')
const {
  createComplaint,
  getAdminComplaints,
  getComplaintStats,
  getMyComplaintContext,
  updateComplaintStatus
} = require('./complaint.controller')
const { protect, authorize } = require('../../middleware/auth.middleware')

const router = express.Router()

router.post('/', protect, authorize('customer'), createComplaint)
router.get('/bookings/:bookingId/context', protect, authorize('customer'), getMyComplaintContext)
router.get('/admin', protect, authorize('admin'), getAdminComplaints)
router.get('/admin/stats', protect, authorize('admin'), getComplaintStats)
router.patch('/:id/status', protect, authorize('admin'), updateComplaintStatus)

module.exports = router
