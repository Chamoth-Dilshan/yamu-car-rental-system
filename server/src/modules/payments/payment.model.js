const mongoose = require('mongoose')
const {
  PAYMENT_CURRENCY,
  PAYMENT_METHODS,
  PAYMENT_STATUSES
} = require('./payment.constants')

const paymentSchema = new mongoose.Schema({
  paymentNo: { type: String, required: true, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: PAYMENT_CURRENCY },
  method: { type: String, enum: PAYMENT_METHODS, required: true },
  status: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
  paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod', default: null },
  transactionId: { type: String, default: '' },
  bookingSnapshot: {
    bookingNo: { type: String, default: '' },
    bookingType: { type: String, default: '' },
    serviceName: { type: String, default: '' },
    vehicleOrDriverName: { type: String, default: '' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null }
  },
  customerSnapshot: {
    fullName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  cardSnapshot: {
    cardholderName: { type: String, default: '' },
    brand: { type: String, default: '' },
    last4: { type: String, default: '' },
    maskedNumber: { type: String, default: '' },
    expiryMonth: { type: String, default: '' },
    expiryYear: { type: String, default: '' },
    token: { type: String, default: '' }
  },
  bankTransfer: {
    accountName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    referenceNo: { type: String, default: '' },
    depositedAt: { type: Date, default: null },
    note: { type: String, default: '' }
  },
  cash: {
    payerName: { type: String, default: '' },
    collectedBy: { type: String, default: '' },
    note: { type: String, default: '' }
  },
  failureReason: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  refund: {
    amount: { type: Number, default: 0, min: 0 },
    reason: { type: String, default: '' },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    refundedAt: { type: Date, default: null }
  }
}, {
  timestamps: true
})

paymentSchema.index({ booking: 1, createdAt: -1 })
paymentSchema.index({ customer: 1, createdAt: -1 })
paymentSchema.index({ status: 1, method: 1 })
paymentSchema.index({ transactionId: 1 })
paymentSchema.index({ 'bookingSnapshot.bookingNo': 1 })

module.exports = mongoose.model('Payment', paymentSchema)
