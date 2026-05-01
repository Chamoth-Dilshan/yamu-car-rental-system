const mongoose = require('mongoose')
const {
  PAYMENT_METHOD_STATUSES
} = require('./payment.constants')

const paymentMethodSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['card'], default: 'card' },
  cardholderName: { type: String, required: true, trim: true },
  brand: { type: String, default: 'unknown' },
  last4: { type: String, required: true },
  maskedNumber: { type: String, required: true },
  expiryMonth: { type: String, required: true },
  expiryYear: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  isDefault: { type: Boolean, default: false },
  status: { type: String, enum: PAYMENT_METHOD_STATUSES, default: 'active' }
}, {
  timestamps: true
})

paymentMethodSchema.index({ customer: 1, status: 1, isDefault: 1 })

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema)
