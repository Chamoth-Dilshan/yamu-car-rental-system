const crypto = require('crypto')
const mongoose = require('mongoose')
const Payment = require('./payment.model')
const UserPaymentCard = require('./userPaymentCard.model')
const Booking = require('../reservations/booking.model')
const User = require('../users/user.model')
const Vehicle = require('../vehicles/vehicle.model')
const {
  PAYMENT_CURRENCY,
  PAYMENT_NO_PREFIX,
  TRANSACTION_ID_PREFIX,
  CARD_TOKEN_PREFIX,
  PROCESSING_PAYMENT_METHODS,
  RECEIPT_BRAND,
  isImmediatePaymentMethod,
  isProcessingPaymentMethod
} = require('./payment.constants')
const {
  isFutureExpiry,
  normalizeAmount
} = require('./payment.validation')
const {
  serializeBooking,
  serializeUserSummary
} = require('../../utils/reservationHelpers')

const bookingPopulate = [
  { path: 'customer', select: 'fullName email phone city profilePic' },
  { path: 'driver', select: 'fullName email phone city profilePic' },
  {
    path: 'vehicle',
    populate: {
      path: 'owner',
      select: 'fullName email phone city profilePic staffProfile.storeName'
    }
  },
  {
    path: 'driverAd',
    populate: {
      path: 'driver',
      select: 'fullName email phone city profilePic'
    }
  }
]

const paymentPopulate = [
  { path: 'customer', select: 'fullName email phone city profilePic' },
  { path: 'paymentMethod' },
  { path: 'verifiedBy', select: 'fullName email phone city profilePic' },
  { path: 'refund.refundedBy', select: 'fullName email phone city profilePic' },
  {
    path: 'booking',
    populate: bookingPopulate
  }
]

const generateUniqueValue = async ({ prefix, model, field }) => {
  let value = ''

  do {
    const timestamp = Date.now().toString(36).toUpperCase()
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
    value = `${prefix}-${timestamp}-${suffix}`
  } while (await model.exists({ [field]: value }))

  return value
}

const generatePaymentNo = () => generateUniqueValue({
  prefix: PAYMENT_NO_PREFIX,
  model: Payment,
  field: 'paymentNo'
})

const generateTransactionId = () => generateUniqueValue({
  prefix: TRANSACTION_ID_PREFIX,
  model: Payment,
  field: 'transactionId'
})

const generateCardToken = async () => {
  let token = ''

  do {
    token = `${CARD_TOKEN_PREFIX}_${crypto.randomBytes(16).toString('hex')}`
  } while (await UserPaymentCard.exists({ token }))

  return token
}

const buildBookingSnapshot = (booking) => {
  const serializedBooking = serializeBooking(booking)

  return {
    bookingNo: serializedBooking?.bookingNo || booking.bookingNo || '',
    bookingType: serializedBooking?.bookingType || booking.bookingType || '',
    serviceName: serializedBooking?.serviceTitle || serializedBooking?.displayVehicle || '',
    vehicleOrDriverName: serializedBooking?.displayVehicle || serializedBooking?.serviceTitle || '',
    startDate: serializedBooking?.startDate || booking.startDate || null,
    endDate: serializedBooking?.endDate || booking.endDate || null
  }
}

const buildCustomerSnapshot = (customer) => ({
  fullName: customer?.fullName || '',
  email: customer?.email || '',
  phone: customer?.phone || ''
})

const serializePaymentMethod = (paymentMethod) => {
  if (!paymentMethod) {
    return null
  }

  const rawMethod = paymentMethod?.toObject ? paymentMethod.toObject() : { ...paymentMethod }

  if (!rawMethod._id && !rawMethod.last4) {
    return null
  }

  return {
    _id: rawMethod._id,
    customer: rawMethod.customer,
    type: rawMethod.type,
    cardholderName: rawMethod.cardholderName,
    brand: rawMethod.brand,
    last4: rawMethod.last4,
    maskedNumber: rawMethod.maskedNumber,
    expiryMonth: rawMethod.expiryMonth,
    expiryYear: rawMethod.expiryYear,
    token: rawMethod.token,
    isDefault: Boolean(rawMethod.isDefault),
    status: rawMethod.status,
    createdAt: rawMethod.createdAt,
    updatedAt: rawMethod.updatedAt
  }
}

const serializePayment = (payment) => {
  if (!payment) {
    return null
  }

  const rawPayment = payment?.toObject ? payment.toObject() : { ...payment }

  return {
    _id: rawPayment._id,
    paymentNo: rawPayment.paymentNo,
    booking: rawPayment.booking?.bookingNo ? serializeBooking(rawPayment.booking) : rawPayment.booking,
    customer: rawPayment.customer?.fullName ? serializeUserSummary(rawPayment.customer) : rawPayment.customer,
    amount: rawPayment.amount,
    currency: rawPayment.currency || PAYMENT_CURRENCY,
    method: rawPayment.method,
    status: rawPayment.status,
    paymentMethod: serializePaymentMethod(rawPayment.paymentMethod),
    transactionId: rawPayment.transactionId || '',
    bookingSnapshot: rawPayment.bookingSnapshot || {},
    customerSnapshot: rawPayment.customerSnapshot || {},
    cardSnapshot: rawPayment.cardSnapshot || {},
    bankTransfer: rawPayment.bankTransfer || {},
    cash: rawPayment.cash || {},
    failureReason: rawPayment.failureReason || '',
    adminNote: rawPayment.adminNote || '',
    verifiedBy: rawPayment.verifiedBy?.fullName ? serializeUserSummary(rawPayment.verifiedBy) : rawPayment.verifiedBy,
    verifiedAt: rawPayment.verifiedAt || null,
    refund: {
      amount: rawPayment.refund?.amount || 0,
      reason: rawPayment.refund?.reason || '',
      refundedBy: rawPayment.refund?.refundedBy?.fullName
        ? serializeUserSummary(rawPayment.refund.refundedBy)
        : rawPayment.refund?.refundedBy || null,
      refundedAt: rawPayment.refund?.refundedAt || null
    },
    createdAt: rawPayment.createdAt,
    updatedAt: rawPayment.updatedAt
  }
}

const expireCustomerCards = async (customerId) => {
  const activeCards = await UserPaymentCard.find({
    customer: customerId,
    status: 'active'
  })

  await Promise.all(activeCards.map(async (card) => {
    if (isFutureExpiry(card.expiryMonth, card.expiryYear)) {
      return
    }

    card.status = 'expired'
    card.isDefault = false
    await card.save()
  }))
}

const ensureDefaultCard = async (customerId) => {
  const defaultCard = await UserPaymentCard.findOne({
    customer: customerId,
    status: 'active',
    isDefault: true
  })

  if (defaultCard) {
    return
  }

  const latestActiveCard = await UserPaymentCard.findOne({
    customer: customerId,
    status: 'active'
  }).sort({ updatedAt: -1, createdAt: -1 })

  if (latestActiveCard) {
    latestActiveCard.isDefault = true
    await latestActiveCard.save()
  }
}

const createPaymentMethodFromCard = async ({
  customerId,
  card,
  isDefault = false
}) => {
  await expireCustomerCards(customerId)

  const activeCardCount = await UserPaymentCard.countDocuments({
    customer: customerId,
    status: 'active'
  })
  const shouldBeDefault = Boolean(isDefault) || activeCardCount === 0

  if (shouldBeDefault) {
    await UserPaymentCard.updateMany(
      { customer: customerId, status: 'active' },
      { $set: { isDefault: false } }
    )
  }

  const paymentMethod = await UserPaymentCard.create({
    customer: customerId,
    type: 'card',
    cardholderName: card.cardholderName,
    brand: card.brand,
    last4: card.last4,
    maskedNumber: card.maskedNumber,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    token: await generateCardToken(),
    isDefault: shouldBeDefault,
    status: 'active'
  })

  return paymentMethod
}

const listPaymentMethods = async (customerId) => {
  await expireCustomerCards(customerId)
  await ensureDefaultCard(customerId)

  return UserPaymentCard.find({
    customer: customerId,
    status: { $ne: 'removed' }
  }).sort({ isDefault: -1, updatedAt: -1, createdAt: -1 })
}

const createPaymentMethod = async ({ customerId, validatedCard }) => (
  createPaymentMethodFromCard({
    customerId,
    card: validatedCard,
    isDefault: validatedCard.isDefault
  })
)

const setDefaultPaymentMethod = async ({ customerId, paymentMethodId }) => {
  await expireCustomerCards(customerId)

  const paymentMethod = await UserPaymentCard.findOne({
    _id: paymentMethodId,
    customer: customerId,
    status: 'active'
  })

  if (!paymentMethod) {
    return { error: 'Saved card not found' }
  }

  if (!isFutureExpiry(paymentMethod.expiryMonth, paymentMethod.expiryYear)) {
    paymentMethod.status = 'expired'
    paymentMethod.isDefault = false
    await paymentMethod.save()
    return { error: 'Expired cards cannot be used as default' }
  }

  await UserPaymentCard.updateMany(
    { customer: customerId, status: 'active' },
    { $set: { isDefault: false } }
  )

  paymentMethod.isDefault = true
  await paymentMethod.save()

  return paymentMethod
}

const removePaymentMethod = async ({ customerId, paymentMethodId }) => {
  const paymentMethod = await UserPaymentCard.findOne({
    _id: paymentMethodId,
    customer: customerId,
    status: { $ne: 'removed' }
  })

  if (!paymentMethod) {
    return { error: 'Saved card not found' }
  }

  const wasDefault = paymentMethod.isDefault
  paymentMethod.status = 'removed'
  paymentMethod.isDefault = false
  await paymentMethod.save()

  if (wasDefault) {
    await ensureDefaultCard(customerId)
  }

  return paymentMethod
}

const findCustomerBooking = (bookingId, customerId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    return null
  }

  return Booking.findOne({ _id: bookingId, customer: customerId }).populate(bookingPopulate)
}

const getActivePaymentForBooking = (bookingId) => (
  Payment.findOne({
    booking: bookingId,
    status: { $in: ['pending', 'processing', 'paid'] }
  }).sort({ createdAt: -1 })
)

const validateBookingForPayment = async ({ booking, amount }) => {
  if (!booking) {
    return { error: 'Booking not found' }
  }

  if (booking.bookingStatus === 'cancelled') {
    return { error: 'Cancelled bookings cannot be paid.' }
  }

  if (booking.bookingStatus === 'closed') {
    return { error: 'Closed bookings cannot be paid.' }
  }

  const activePayment = await getActivePaymentForBooking(booking._id)

  if (booking.paymentStatus === 'paid') {
    if (activePayment?.status === 'paid') {
      return { error: 'This booking is already paid.' }
    }

    booking.paymentStatus = 'pending'
    await booking.save()
  }

  if (booking.paymentStatus === 'refunded') {
    return { error: 'Refunded bookings cannot be paid again' }
  }

  if (booking.bookingStatus !== 'completed') {
    return { error: 'Payment is available only after the trip is completed.' }
  }

  const expectedAmount = normalizeAmount(booking.totalAmount)

  if (expectedAmount === null || expectedAmount <= 0) {
    return { error: 'Booking total amount is invalid' }
  }

  if (amount !== expectedAmount) {
    return { error: 'Payment amount must match booking total amount' }
  }

  if (activePayment) {
    return { error: `A ${activePayment.status} payment already exists for this booking` }
  }

  return { expectedAmount }
}

const buildCardSnapshotFromPaymentMethod = (paymentMethod) => ({
  cardholderName: paymentMethod.cardholderName,
  brand: paymentMethod.brand,
  last4: paymentMethod.last4,
  maskedNumber: paymentMethod.maskedNumber,
  expiryMonth: paymentMethod.expiryMonth,
  expiryYear: paymentMethod.expiryYear,
  token: paymentMethod.token
})

const createCheckoutPayment = async ({ booking, customer, validatedPayment }) => {
  const bookingValidation = await validateBookingForPayment({
    booking,
    amount: validatedPayment.amount
  })

  if (bookingValidation.error) {
    return bookingValidation
  }

  let paymentMethod = null
  let cardSnapshot = undefined

  if (validatedPayment.method === 'card') {
    cardSnapshot = { ...validatedPayment.card }

    if (validatedPayment.saveCard) {
      paymentMethod = await createPaymentMethodFromCard({
        customerId: customer._id,
        card: validatedPayment.card,
        isDefault: validatedPayment.setDefault
      })
      cardSnapshot.token = paymentMethod.token
    }
  }

  if (validatedPayment.method === 'saved_card') {
    await expireCustomerCards(customer._id)

    paymentMethod = await UserPaymentCard.findOne({
      _id: validatedPayment.paymentMethodId,
      customer: customer._id,
      status: 'active'
    })

    if (!paymentMethod) {
      return { error: 'Saved card not found' }
    }

    if (!isFutureExpiry(paymentMethod.expiryMonth, paymentMethod.expiryYear)) {
      paymentMethod.status = 'expired'
      paymentMethod.isDefault = false
      await paymentMethod.save()
      return { error: 'Expired saved cards cannot be used' }
    }

    cardSnapshot = buildCardSnapshotFromPaymentMethod(paymentMethod)
  }

  const status = isImmediatePaymentMethod(validatedPayment.method) ? 'paid' : 'processing'
  const payment = await Payment.create({
    paymentNo: await generatePaymentNo(),
    booking: booking._id,
    customer: customer._id,
    amount: bookingValidation.expectedAmount,
    currency: PAYMENT_CURRENCY,
    method: validatedPayment.method,
    status,
    paymentMethod: paymentMethod?._id || null,
    transactionId: status === 'paid' ? await generateTransactionId() : '',
    bookingSnapshot: buildBookingSnapshot(booking),
    customerSnapshot: buildCustomerSnapshot(customer),
    cardSnapshot,
    cash: validatedPayment.cash,
    bankTransfer: validatedPayment.bankTransfer
  })

  if (status === 'paid') {
    booking.paymentStatus = 'paid'
    await booking.save()
  }

  return Payment.findById(payment._id).populate(paymentPopulate)
}

const findBookingForAdminManualPayment = (validatedPayment) => {
  const query = validatedPayment.bookingId && mongoose.isValidObjectId(validatedPayment.bookingId)
    ? { _id: validatedPayment.bookingId }
    : { bookingNo: validatedPayment.bookingNo }

  return Booking.findOne(query).populate(bookingPopulate)
}

const createAdminManualPayment = async ({ admin, validatedPayment }) => {
  const booking = await findBookingForAdminManualPayment(validatedPayment)

  if (!booking) {
    return { error: 'Booking not found' }
  }

  const bookingValidation = await validateBookingForPayment({
    booking,
    amount: validatedPayment.amount
  })

  if (bookingValidation.error) {
    return bookingValidation
  }

  const payment = await Payment.create({
    paymentNo: await generatePaymentNo(),
    booking: booking._id,
    customer: booking.customer?._id || booking.customer,
    amount: bookingValidation.expectedAmount,
    currency: PAYMENT_CURRENCY,
    method: 'admin_manual',
    status: 'paid',
    transactionId: await generateTransactionId(),
    bookingSnapshot: buildBookingSnapshot(booking),
    customerSnapshot: buildCustomerSnapshot(booking.customer),
    cash: validatedPayment.cash,
    adminNote: validatedPayment.adminNote,
    verifiedBy: admin._id,
    verifiedAt: new Date()
  })

  booking.paymentStatus = 'paid'
  await booking.save()

  return Payment.findById(payment._id).populate(paymentPopulate)
}

const buildSearchQuery = async (search = '') => {
  const term = String(search || '').trim()

  if (!term) {
    return null
  }

  const regex = new RegExp(term, 'i')
  const matchingCustomerIds = await User.find({
    $or: [
      { fullName: regex },
      { email: regex },
      { phone: regex }
    ]
  }).distinct('_id')

  return {
    $or: [
      { paymentNo: regex },
      { transactionId: regex },
      { 'bookingSnapshot.bookingNo': regex },
      { 'bookingSnapshot.serviceName': regex },
      { 'bookingSnapshot.vehicleOrDriverName': regex },
      { 'customerSnapshot.fullName': regex },
      { 'customerSnapshot.email': regex },
      { 'cardSnapshot.last4': regex },
      { customer: { $in: matchingCustomerIds } }
    ]
  }
}

const listPayments = async ({
  customerId = null,
  status = 'all',
  method = 'all',
  search = '',
  staffId = null,
  driverId = null
} = {}) => {
  const query = {}

  if (customerId) {
    query.customer = customerId
  }

  if (status && status !== 'all') {
    query.status = status
  }

  if (method === 'card_payment') {
    query.method = { $in: ['card', 'saved_card'] }
  } else if (method && method !== 'all') {
    query.method = method
  }

  if (staffId) {
    const ownedVehicleIds = await Vehicle.find({ owner: staffId }).distinct('_id')
    const bookingIds = await Booking.find({
      bookingType: 'vehicle',
      vehicle: { $in: ownedVehicleIds }
    }).distinct('_id')
    query.booking = { $in: bookingIds }
  }

  if (driverId) {
    const bookingIds = await Booking.find({
      bookingType: 'driver',
      driver: driverId
    }).distinct('_id')
    query.booking = { $in: bookingIds }
  }

  const searchQuery = await buildSearchQuery(search)
  const finalQuery = searchQuery ? { ...query, ...searchQuery } : query

  return Payment.find(finalQuery)
    .populate(paymentPopulate)
    .sort({ createdAt: -1 })
}

const verifyPayment = async ({ paymentId, admin, payload }) => {
  const payment = await Payment.findById(paymentId).populate(paymentPopulate)

  if (!payment) {
    return { error: 'Payment not found' }
  }

  if (!PROCESSING_PAYMENT_METHODS.includes(payment.method)) {
    return { error: 'Only cash, bank transfer, or admin manual payments can be verified manually' }
  }

  if (payment.status !== 'processing') {
    return { error: 'Only processing payments can be verified' }
  }

  const booking = await Booking.findById(payment.booking?._id || payment.booking)

  if (!booking) {
    return { error: 'Linked booking not found' }
  }

  if (['cancelled', 'closed'].includes(booking.bookingStatus)) {
    return { error: 'Cancelled or closed bookings cannot be marked paid' }
  }

  if (booking.bookingStatus !== 'completed') {
    return { error: 'Payments can be verified only after the trip is completed' }
  }

  payment.status = 'paid'
  payment.transactionId = payment.transactionId || await generateTransactionId()
  payment.verifiedBy = admin._id
  payment.verifiedAt = new Date()
  payment.adminNote = payload.adminNote
  payment.failureReason = ''

  booking.paymentStatus = 'paid'

  await Promise.all([payment.save(), booking.save()])

  return Payment.findById(payment._id).populate(paymentPopulate)
}

const refundPayment = async ({ paymentId, admin, payload }) => {
  const payment = await Payment.findById(paymentId).populate(paymentPopulate)

  if (!payment) {
    return { error: 'Payment not found' }
  }

  if (payment.status !== 'paid') {
    return { error: 'Only paid payments can be refunded' }
  }

  const refundAmount = payload.amount === null ? normalizeAmount(payment.amount) : payload.amount

  if (refundAmount > normalizeAmount(payment.amount)) {
    return { error: 'Refund amount cannot exceed paid amount' }
  }

  const booking = await Booking.findById(payment.booking?._id || payment.booking)

  if (!booking) {
    return { error: 'Linked booking not found' }
  }

  payment.status = 'refunded'
  payment.refund = {
    amount: refundAmount,
    reason: payload.reason,
    refundedBy: admin._id,
    refundedAt: new Date()
  }

  booking.paymentStatus = 'refunded'

  await Promise.all([payment.save(), booking.save()])

  return Payment.findById(payment._id).populate(paymentPopulate)
}

const formatPaymentMethodLabel = (payment) => {
  if (payment.method === 'card') {
    return `${payment.cardSnapshot?.brand || 'Card'} ${payment.cardSnapshot?.maskedNumber || ''}`.trim()
  }

  if (payment.method === 'saved_card') {
    return `Saved ${payment.cardSnapshot?.brand || 'Card'} ${payment.cardSnapshot?.maskedNumber || ''}`.trim()
  }

  if (payment.method === 'bank_transfer') {
    return `Bank transfer${payment.bankTransfer?.bankName ? ` - ${payment.bankTransfer.bankName}` : ''}`
  }

  if (payment.method === 'admin_manual') {
    return 'Admin manual payment'
  }

  return 'Cash on pickup'
}

const buildReceipt = (payment) => {
  const rawPayment = payment?.toObject ? payment.toObject() : { ...payment }
  const booking = serializeBooking(rawPayment.booking) || {}
  const bookingSnapshot = rawPayment.bookingSnapshot || {}
  const customer = serializeUserSummary(rawPayment.customer) || {}
  const customerSnapshot = rawPayment.customerSnapshot || {}

  return {
    brand: RECEIPT_BRAND,
    paymentNo: rawPayment.paymentNo,
    transactionId: rawPayment.transactionId || 'Pending verification',
    bookingNo: bookingSnapshot.bookingNo || booking.bookingNo || '',
    customerName: customerSnapshot.fullName || customer.fullName || '',
    bookingType: bookingSnapshot.bookingType || booking.bookingType || '',
    serviceName: bookingSnapshot.vehicleOrDriverName || bookingSnapshot.serviceName || booking.displayVehicle || '',
    paymentMethod: formatPaymentMethodLabel(rawPayment),
    amount: rawPayment.amount,
    currency: rawPayment.currency || PAYMENT_CURRENCY,
    paymentStatus: rawPayment.status,
    paidDate: rawPayment.status === 'paid' || rawPayment.status === 'refunded'
      ? (rawPayment.verifiedAt || rawPayment.updatedAt || rawPayment.createdAt)
      : null,
    receiptGeneratedAt: new Date()
  }
}

const canAccessPayment = (payment, user) => {
  if (!payment || !user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  const customerId = payment.customer?._id || payment.customer
  if (String(customerId) === String(user._id)) {
    return true
  }

  const booking = payment.booking
  if (user.role === 'driver') {
    const driverId = booking?.driver?._id || booking?.driver
    return String(driverId) === String(user._id)
  }

  if (user.role === 'staff') {
    const ownerId = booking?.vehicle?.owner?._id || booking?.vehicle?.owner
    return String(ownerId) === String(user._id)
  }

  return false
}

const getPaymentReceipt = async ({ paymentId, user }) => {
  if (!mongoose.isValidObjectId(paymentId)) {
    return { error: 'Payment not found', statusCode: 404 }
  }

  const payment = await Payment.findById(paymentId).populate(paymentPopulate)

  if (!payment) {
    return { error: 'Payment not found', statusCode: 404 }
  }

  if (!canAccessPayment(payment, user)) {
    return { error: 'Not authorized to view this receipt', statusCode: 403 }
  }

  if (user.role === 'customer' && payment.status !== 'paid') {
    return { error: 'Receipt is available only for successful paid payments', statusCode: 400 }
  }

  return {
    payment,
    receipt: buildReceipt(payment)
  }
}

const buildStats = (payments = []) => ({
  totalPayments: payments.length,
  pendingCount: payments.filter((payment) => payment.status === 'pending').length,
  processingCount: payments.filter((payment) => payment.status === 'processing').length,
  paidCount: payments.filter((payment) => payment.status === 'paid').length,
  failedCount: payments.filter((payment) => payment.status === 'failed').length,
  cancelledCount: payments.filter((payment) => payment.status === 'cancelled').length,
  refundedCount: payments.filter((payment) => payment.status === 'refunded').length,
  cardCount: payments.filter((payment) => ['card', 'saved_card'].includes(payment.method)).length,
  cashCount: payments.filter((payment) => payment.method === 'cash').length,
  bankTransferCount: payments.filter((payment) => payment.method === 'bank_transfer').length
})

module.exports = {
  paymentPopulate,
  bookingPopulate,
  generatePaymentNo,
  generateTransactionId,
  generateCardToken,
  serializePayment,
  serializePaymentMethod,
  listPaymentMethods,
  createPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
  findCustomerBooking,
  createCheckoutPayment,
  createAdminManualPayment,
  listPayments,
  verifyPayment,
  refundPayment,
  buildReceipt,
  getPaymentReceipt,
  buildStats,
  isProcessingPaymentMethod
}
