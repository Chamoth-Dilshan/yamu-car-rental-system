const {
  addNotificationToAdmins,
  addNotificationToUser
} = require('../../utils/notificationHelpers')
const { sendServerError } = require('../../utils/errorResponses')
const {
  getFileMetadataFromUpload,
  removeUploadedFiles,
  sendProtectedUpload
} = require('../../utils/fileHelpers')
const {
  validateCheckoutPayload,
  validateAdminManualPayload,
  validatePaymentMethodPayload,
  validateRefundPayload,
  validateVerifyPayload
} = require('./payment.validation')
const {
  createCheckoutPayment,
  createAdminManualPayment,
  createPaymentMethod,
  findCustomerBooking,
  getPaymentReceipt,
  getPaymentProof,
  listPaymentMethods,
  listPayments,
  removePaymentMethod,
  refundPayment,
  serializePayment,
  serializePaymentMethod,
  setDefaultPaymentMethod,
  verifyPayment,
  buildStats
} = require('./payment.service')

const parseStructuredBody = (req) => {
  if (req.body?.payload === undefined) {
    return { payload: req.body || {} }
  }

  if (typeof req.body.payload === 'object') {
    return { payload: req.body.payload || {} }
  }

  try {
    return { payload: JSON.parse(req.body.payload || '{}') }
  } catch {
    return { error: 'Invalid JSON payload' }
  }
}

const getMyPaymentMethods = async (req, res) => {
  try {
    const methods = await listPaymentMethods(req.user._id)
    return res.json({ methods: methods.map(serializePaymentMethod) })
  } catch (error) {
    return sendServerError(res, error, 'Failed to load payment methods')
  }
}

const createMyPaymentMethod = async (req, res) => {
  try {
    const validatedCard = validatePaymentMethodPayload(req.body)

    if (validatedCard.error) {
      return res.status(400).json({ message: validatedCard.error })
    }

    const method = await createPaymentMethod({
      customerId: req.user._id,
      validatedCard
    })

    return res.status(201).json({
      message: 'Card added',
      method: serializePaymentMethod(method)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to save card')
  }
}

const setMyDefaultPaymentMethod = async (req, res) => {
  try {
    const method = await setDefaultPaymentMethod({
      customerId: req.user._id,
      paymentMethodId: req.params.id
    })

    if (method.error) {
      return res.status(400).json({ message: method.error })
    }

    return res.json({
      message: 'Default card updated',
      method: serializePaymentMethod(method)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to update default card')
  }
}

const deleteMyPaymentMethod = async (req, res) => {
  try {
    const method = await removePaymentMethod({
      customerId: req.user._id,
      paymentMethodId: req.params.id
    })

    if (method.error) {
      return res.status(404).json({ message: method.error })
    }

    return res.json({ message: 'Saved card removed' })
  } catch (error) {
    return sendServerError(res, error, 'Failed to remove saved card')
  }
}

const checkoutBookingPayment = async (req, res) => {
  try {
    const parsedBody = parseStructuredBody(req)
    if (parsedBody.error) {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: parsedBody.error })
    }

    const validatedPayment = validateCheckoutPayload(parsedBody.payload)

    if (validatedPayment.error) {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: validatedPayment.error })
    }

    if (validatedPayment.method === 'admin_manual') {
      removeUploadedFiles([req.file])
      return res.status(403).json({ message: 'Admin manual payments cannot be submitted from customer checkout' })
    }

    if (req.file && validatedPayment.method !== 'bank_transfer') {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: 'Payment proof files are only supported for bank transfers' })
    }

    if (validatedPayment.method === 'bank_transfer') {
      if (!req.file) {
        return res.status(400).json({ message: 'Bank transfer proof file is required' })
      }

      validatedPayment.bankTransfer = {
        ...validatedPayment.bankTransfer,
        proofFile: getFileMetadataFromUpload(req.file, req.uploadDir)
      }
    }

    const booking = await findCustomerBooking(req.params.bookingId, req.user._id)

    if (!booking) {
      removeUploadedFiles([req.file])
      return res.status(404).json({ message: 'Booking not found' })
    }

    const payment = await createCheckoutPayment({
      booking,
      customer: req.user,
      validatedPayment
    })

    if (payment.error) {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: payment.error })
    }

    const isPaid = payment.status === 'paid'
    const notificationTasks = [
      addNotificationToUser(req.user._id, {
        type: 'payment',
        title: isPaid ? 'Payment successful' : 'Payment submitted',
        message: isPaid
          ? `Payment ${payment.paymentNo} for booking ${booking.bookingNo} was completed.`
          : `Payment ${payment.paymentNo} for booking ${booking.bookingNo} is pending admin verification.`,
        link: isPaid ? `/payments/${payment._id}/receipt` : '/payments/history'
      })
    ]

    if (!isPaid) {
      notificationTasks.push(addNotificationToAdmins({
        type: 'payment',
        title: 'Payment awaiting verification',
        message: `Payment ${payment.paymentNo} for booking ${booking.bookingNo} needs verification.`,
        link: '/admin/payments'
      }))
    }

    await Promise.all(notificationTasks)

    return res.status(201).json({
      message: isPaid ? 'Payment completed successfully' : 'Payment submitted for admin verification',
      payment: serializePayment(payment)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to process payment')
  }
}

const getMyPayments = async (req, res) => {
  try {
    const { status = 'all', method = 'all', search = '' } = req.query
    const payments = await listPayments({
      customerId: req.user._id,
      status,
      method,
      search
    })

    return res.json({
      payments: payments.map(serializePayment),
      stats: buildStats(payments)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to load payments')
  }
}

const getReceipt = async (req, res) => {
  try {
    const result = await getPaymentReceipt({
      paymentId: req.params.id,
      user: req.user
    })

    if (result.error) {
      return res.status(result.statusCode || 400).json({ message: result.error })
    }

    return res.json({
      payment: serializePayment(result.payment),
      receipt: result.receipt
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to load receipt')
  }
}

const getProof = async (req, res) => {
  try {
    const result = await getPaymentProof({
      paymentId: req.params.id,
      user: req.user
    })

    if (result.error) {
      return res.status(result.statusCode || 400).json({ message: result.error })
    }

    return sendProtectedUpload(res, result.proofFile)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load payment proof')
  }
}

const getAdminPayments = async (req, res) => {
  try {
    const { status = 'all', method = 'all', search = '' } = req.query
    const payments = await listPayments({ status, method, search })

    return res.json({
      payments: payments.map(serializePayment),
      stats: buildStats(payments)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to load admin payments')
  }
}

const recordAdminManualPayment = async (req, res) => {
  try {
    const validatedPayload = validateAdminManualPayload(req.body)

    if (validatedPayload.error) {
      return res.status(400).json({ message: validatedPayload.error })
    }

    const payment = await createAdminManualPayment({
      admin: req.user,
      validatedPayment: validatedPayload
    })

    if (payment.error) {
      return res.status(400).json({ message: payment.error })
    }

    await Promise.all([
      addNotificationToUser(payment.customer?._id || payment.customer, {
        type: 'payment',
        title: 'Manual payment recorded',
        message: `Payment ${payment.paymentNo} was recorded by an administrator.`,
        link: `/payments/${payment._id}/receipt`
      }),
      addNotificationToUser(req.user._id, {
        type: 'admin',
        title: 'Manual payment recorded',
        message: `You recorded manual payment ${payment.paymentNo}.`,
        link: '/admin/payments'
      })
    ])

    return res.status(201).json({
      message: 'Manual payment recorded',
      payment: serializePayment(payment)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to record manual payment')
  }
}

const verifyAdminPayment = async (req, res) => {
  try {
    const validatedPayload = validateVerifyPayload(req.body)
    const payment = await verifyPayment({
      paymentId: req.params.id,
      admin: req.user,
      payload: validatedPayload
    })

    if (payment.error) {
      return res.status(400).json({ message: payment.error })
    }

    await Promise.all([
      addNotificationToUser(payment.customer?._id || payment.customer, {
        type: 'payment',
        title: 'Payment verified',
        message: `Payment ${payment.paymentNo} was verified and marked as paid.`,
        link: `/payments/${payment._id}/receipt`
      }),
      addNotificationToUser(req.user._id, {
        type: 'admin',
        title: 'Payment verified',
        message: `You verified payment ${payment.paymentNo}.`,
        link: '/admin/payments'
      })
    ])

    return res.json({
      message: 'Payment verified',
      payment: serializePayment(payment)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to verify payment')
  }
}

const refundAdminPayment = async (req, res) => {
  try {
    const validatedPayload = validateRefundPayload(req.body)

    if (validatedPayload.error) {
      return res.status(400).json({ message: validatedPayload.error })
    }

    const payment = await refundPayment({
      paymentId: req.params.id,
      admin: req.user,
      payload: validatedPayload
    })

    if (payment.error) {
      return res.status(400).json({ message: payment.error })
    }

    await Promise.all([
      addNotificationToUser(payment.customer?._id || payment.customer, {
        type: 'payment',
        title: 'Payment refunded',
        message: `Payment ${payment.paymentNo} was refunded.`,
        link: `/payments/${payment._id}/receipt`
      }),
      addNotificationToUser(req.user._id, {
        type: 'admin',
        title: 'Payment refunded',
        message: `You refunded payment ${payment.paymentNo}.`,
        link: '/admin/payments'
      })
    ])

    return res.json({
      message: 'Payment refunded',
      payment: serializePayment(payment)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to refund payment')
  }
}

const getStaffPayments = async (req, res) => {
  try {
    const { status = 'all', method = 'all', search = '' } = req.query
    const payments = await listPayments({
      staffId: req.user._id,
      status,
      method,
      search
    })

    return res.json({
      payments: payments.map(serializePayment),
      stats: buildStats(payments)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to load store payments')
  }
}

const getDriverPayments = async (req, res) => {
  try {
    const { status = 'all', method = 'all', search = '' } = req.query
    const payments = await listPayments({
      driverId: req.user._id,
      status,
      method,
      search
    })

    return res.json({
      payments: payments.map(serializePayment),
      stats: buildStats(payments)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to load driver payments')
  }
}

const updatePaymentStatusLegacy = async (req, res) => {
  const legacyStatus = String(req.body.status || '').trim().toLowerCase()

  if (legacyStatus === 'completed') {
    return verifyAdminPayment(req, res)
  }

  if (legacyStatus === 'refunded') {
    req.body = {
      amount: req.body.amount,
      reason: req.body.reason || req.body.adminNote || 'Refunded by admin'
    }
    return refundAdminPayment(req, res)
  }

  return res.status(400).json({
    message: 'Use /api/payments/admin/:id/verify or /api/payments/admin/:id/refund for payment status changes'
  })
}

module.exports = {
  getMyPaymentMethods,
  createMyPaymentMethod,
  setMyDefaultPaymentMethod,
  deleteMyPaymentMethod,
  checkoutBookingPayment,
  getMyPayments,
  getReceipt,
  getProof,
  getAdminPayments,
  recordAdminManualPayment,
  verifyAdminPayment,
  refundAdminPayment,
  getStaffPayments,
  getDriverPayments,
  updatePaymentStatusLegacy
}
