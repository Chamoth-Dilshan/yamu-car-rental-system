const PAYMENT_METHODS = ['card', 'saved_card', 'cash', 'bank_transfer', 'admin_manual']
const PAYMENT_STATUSES = ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded']
const PAYMENT_METHOD_STATUSES = ['active', 'removed', 'expired']
const BOOKING_PAYMENT_STATUSES = ['pending', 'paid', 'refunded']

const PAYMENT_CURRENCY = 'LKR'
const PAYMENT_NO_PREFIX = 'PAY'
const TRANSACTION_ID_PREFIX = 'TXN'
const CARD_TOKEN_PREFIX = 'card_tok'

const PROCESSING_PAYMENT_METHODS = ['cash', 'bank_transfer', 'admin_manual']
const IMMEDIATE_PAYMENT_METHODS = ['card', 'saved_card']

const RECEIPT_BRAND = {
  name: 'YAMU Car Rental Management System',
  shortName: 'YAMU',
  address: 'Sri Lanka',
  note: 'Payment receipt'
}

const isProcessingPaymentMethod = (method) => PROCESSING_PAYMENT_METHODS.includes(method)
const isImmediatePaymentMethod = (method) => IMMEDIATE_PAYMENT_METHODS.includes(method)

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_METHOD_STATUSES,
  BOOKING_PAYMENT_STATUSES,
  PAYMENT_CURRENCY,
  PAYMENT_NO_PREFIX,
  TRANSACTION_ID_PREFIX,
  CARD_TOKEN_PREFIX,
  PROCESSING_PAYMENT_METHODS,
  IMMEDIATE_PAYMENT_METHODS,
  RECEIPT_BRAND,
  isProcessingPaymentMethod,
  isImmediatePaymentMethod
}
