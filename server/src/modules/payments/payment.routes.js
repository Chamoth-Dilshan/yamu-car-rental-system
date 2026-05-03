const express = require('express')
const {
  checkoutBookingPayment,
  createMyPaymentMethod,
  deleteMyPaymentMethod,
  getAdminPayments,
  getDriverPayments,
  getMyPaymentMethods,
  getMyPayments,
  getProof,
  getReceipt,
  getStaffPayments,
  recordAdminManualPayment,
  refundAdminPayment,
  setMyDefaultPaymentMethod,
  updatePaymentStatusLegacy,
  verifyAdminPayment
} = require('./payment.controller')
const {
  protect,
  authorize,
  authorizePermissions
} = require('../../middleware/auth.middleware')
const upload = require('../../middleware/upload.middleware')

const router = express.Router()
const { privateDocumentUpload } = upload

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    module: 'payments',
    message: 'payments module ready'
  })
})

router.get('/methods', protect, authorize('customer'), getMyPaymentMethods)
router.post('/methods', protect, authorize('customer'), createMyPaymentMethod)
router.put('/methods/:id/default', protect, authorize('customer'), setMyDefaultPaymentMethod)
router.delete('/methods/:id', protect, authorize('customer'), deleteMyPaymentMethod)

router.post(
  '/checkout/:bookingId',
  protect,
  authorize('customer'),
  (req, res, next) => { req.uploadDir = `payments/${req.user._id}`; next() },
  privateDocumentUpload.single('proof'),
  checkoutBookingPayment
)
router.get('/my', protect, authorize('customer'), getMyPayments)
router.get('/staff', protect, authorize('staff'), getStaffPayments)
router.get('/driver', protect, authorize('driver'), getDriverPayments)

router.get('/admin/all', protect, authorize('admin'), authorizePermissions('payments.manage'), getAdminPayments)
router.post('/admin/manual', protect, authorize('admin'), authorizePermissions('payments.manage'), recordAdminManualPayment)
router.put('/admin/:id/verify', protect, authorize('admin'), authorizePermissions('payments.manage'), verifyAdminPayment)
router.put('/admin/:id/refund', protect, authorize('admin'), authorizePermissions('payments.manage'), refundAdminPayment)

router.get('/:id/proof', protect, getProof)
router.get('/:id/receipt', protect, getReceipt)

router.post(
  '/bookings/:bookingId',
  protect,
  authorize('customer'),
  (req, res, next) => { req.uploadDir = `payments/${req.user._id}`; next() },
  privateDocumentUpload.single('proof'),
  checkoutBookingPayment
)
router.get('/customer', protect, authorize('customer'), getMyPayments)
router.get('/admin', protect, authorize('admin'), authorizePermissions('payments.manage'), getAdminPayments)
router.put('/:id/status', protect, authorize('admin'), authorizePermissions('payments.manage'), updatePaymentStatusLegacy)

module.exports = router
