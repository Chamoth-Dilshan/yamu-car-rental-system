const express = require('express')
const {
  createComplaint,
  getComplaintAttachment,
  getAdminComplaints,
  getComplaintStats,
  getMyComplaintContext,
  updateComplaintStatus
} = require('./complaint.controller')
const { protect, authorize } = require('../../middleware/auth.middleware')
const upload = require('../../middleware/upload.middleware')

const router = express.Router()
const { privateDocumentUpload } = upload

router.post(
  '/',
  protect,
  authorize('customer'),
  (req, res, next) => { req.uploadDir = `complaints/${req.user._id}`; next() },
  privateDocumentUpload.single('attachment'),
  createComplaint
)
router.get('/bookings/:bookingId/context', protect, authorize('customer'), getMyComplaintContext)
router.get('/admin', protect, authorize('admin'), getAdminComplaints)
router.get('/admin/stats', protect, authorize('admin'), getComplaintStats)
router.get('/:id/attachment', protect, getComplaintAttachment)
router.patch('/:id/status', protect, authorize('admin'), updateComplaintStatus)

module.exports = router
