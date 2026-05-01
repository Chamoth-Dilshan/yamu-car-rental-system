const {
  PAYMENT_METHODS
} = require('./payment.constants')

const trimValue = (value = '') => String(value || '').trim()
const normalizeDigits = (value = '') => trimValue(value).replace(/\D/g, '')
const normalizeMonth = (value = '') => normalizeDigits(value).padStart(2, '0')
const normalizeYear = (value = '') => {
  const year = normalizeDigits(value)
  return year.length === 2 ? `20${year}` : year
}

const normalizeAmount = (value) => {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount < 0) {
    return null
  }

  return Math.round(amount * 100) / 100
}

const isLuhnValid = (cardNumber = '') => {
  const digits = normalizeDigits(cardNumber)

  if (!/^\d{13,19}$/.test(digits)) {
    return false
  }

  let sum = 0
  let shouldDouble = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])

    if (shouldDouble) {
      digit *= 2

      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

const detectCardBrand = (cardNumber = '') => {
  const digits = normalizeDigits(cardNumber)

  if (/^4/.test(digits)) {
    return 'Visa'
  }

  if (/^(5[1-5]|2[2-7])/.test(digits)) {
    return 'Mastercard'
  }

  if (/^3[47]/.test(digits)) {
    return 'Amex'
  }

  return 'unknown'
}

const isFutureExpiry = (month, year) => {
  const normalizedMonth = normalizeMonth(month)
  const normalizedYear = normalizeYear(year)
  const monthNumber = Number(normalizedMonth)
  const yearNumber = Number(normalizedYear)

  if (!/^\d{2}$/.test(normalizedMonth) || monthNumber < 1 || monthNumber > 12) {
    return false
  }

  if (!/^\d{4}$/.test(normalizedYear) || yearNumber < new Date().getFullYear()) {
    return false
  }

  const expiryDate = new Date(Date.UTC(yearNumber, monthNumber, 0, 23, 59, 59, 999))
  return expiryDate >= new Date()
}

const maskCardNumber = (cardNumber = '') => {
  const digits = normalizeDigits(cardNumber)
  const last4 = digits.slice(-4)
  return last4 ? `**** **** **** ${last4}` : ''
}

const validateCardInput = (card = {}) => {
  const cardholderName = trimValue(card.cardholderName || card.cardHolderName)
  const cardNumber = normalizeDigits(card.cardNumber || card.number)
  const cvv = normalizeDigits(card.cvv || card.cvn)
  const expiryMonth = normalizeMonth(card.expiryMonth || card.expirationMonth)
  const expiryYear = normalizeYear(card.expiryYear || card.expirationYear)

  if (!cardholderName || !/^[A-Za-z][A-Za-z\s'.-]{1,80}$/.test(cardholderName)) {
    return { error: 'Cardholder name is required and can only contain letters, spaces, apostrophes, dots, or hyphens' }
  }

  if (!cardNumber) {
    return { error: 'Card number is required' }
  }

  if (!isLuhnValid(cardNumber)) {
    return { error: 'Card number is invalid' }
  }

  if (!isFutureExpiry(expiryMonth, expiryYear)) {
    return { error: 'Expiry date must be in the future' }
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    return { error: 'CVV must be 3 or 4 digits' }
  }

  return {
    cardholderName,
    brand: detectCardBrand(cardNumber),
    last4: cardNumber.slice(-4),
    maskedNumber: maskCardNumber(cardNumber),
    expiryMonth,
    expiryYear
  }
}

const validatePaymentMethodPayload = (payload = {}) => {
  const card = validateCardInput(payload.card || payload)

  if (card.error) {
    return card
  }

  return {
    ...card,
    isDefault: Boolean(payload.isDefault)
  }
}

const validateCheckoutPayload = (payload = {}) => {
  const method = trimValue(payload.method).toLowerCase()
  const amount = normalizeAmount(payload.amount)

  if (!PAYMENT_METHODS.includes(method)) {
    return { error: 'Unsupported payment method' }
  }

  if (amount === null) {
    return { error: 'Payment amount is required' }
  }

  if (method === 'card') {
    const card = validateCardInput(payload.card || {})

    if (card.error) {
      return card
    }

    return {
      method,
      amount,
      card,
      saveCard: Boolean(payload.saveCard),
      setDefault: Boolean(payload.setDefault)
    }
  }

  if (method === 'saved_card') {
    const paymentMethodId = trimValue(payload.paymentMethodId || payload.paymentMethod)
    const cvv = normalizeDigits(payload.cvv || payload.cvn)

    if (!paymentMethodId) {
      return { error: 'Saved card is required' }
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return { error: 'CVV must be 3 or 4 digits' }
    }

    return {
      method,
      amount,
      paymentMethodId
    }
  }

  if (method === 'cash') {
    return {
      method,
      amount,
      cash: {
        payerName: trimValue(payload.cash?.payerName),
        note: trimValue(payload.cash?.note)
      }
    }
  }

  if (method === 'bank_transfer') {
    const accountName = trimValue(payload.bankTransfer?.accountName)
    const bankName = trimValue(payload.bankTransfer?.bankName)
    const referenceNo = trimValue(payload.bankTransfer?.referenceNo)

    if (!accountName) {
      return { error: 'Bank transfer account name is required' }
    }

    if (!bankName) {
      return { error: 'Bank name is required' }
    }

    if (!referenceNo) {
      return { error: 'Bank transfer reference number is required' }
    }

    return {
      method,
      amount,
      bankTransfer: {
        accountName,
        bankName,
        referenceNo,
        depositedAt: payload.bankTransfer?.depositedAt || null,
        note: trimValue(payload.bankTransfer?.note)
      }
    }
  }

  if (method === 'admin_manual') {
    return {
      method,
      amount,
      cash: {
        payerName: trimValue(payload.cash?.payerName),
        collectedBy: trimValue(payload.cash?.collectedBy),
        note: trimValue(payload.cash?.note)
      }
    }
  }

  return { error: 'Unsupported payment method' }
}

const validateVerifyPayload = (payload = {}) => ({
  adminNote: trimValue(payload.adminNote || payload.note)
})

const validateRefundPayload = (payload = {}) => {
  const amount = payload.amount === undefined || payload.amount === null || payload.amount === ''
    ? null
    : normalizeAmount(payload.amount)
  const reason = trimValue(payload.reason)

  if (amount !== null && amount <= 0) {
    return { error: 'Refund amount must be greater than zero' }
  }

  if (!reason) {
    return { error: 'Refund reason is required' }
  }

  return {
    amount,
    reason
  }
}

const validateAdminManualPayload = (payload = {}) => {
  const bookingId = trimValue(payload.bookingId)
  const bookingNo = trimValue(payload.bookingNo)
  const amount = normalizeAmount(payload.amount)

  if (!bookingId && !bookingNo) {
    return { error: 'Booking ID or booking number is required' }
  }

  if (amount === null) {
    return { error: 'Payment amount is required' }
  }

  return {
    bookingId,
    bookingNo,
    amount,
    cash: {
      payerName: trimValue(payload.cash?.payerName || payload.payerName),
      collectedBy: trimValue(payload.cash?.collectedBy || payload.collectedBy),
      note: trimValue(payload.cash?.note || payload.note)
    },
    adminNote: trimValue(payload.adminNote)
  }
}

module.exports = {
  trimValue,
  normalizeAmount,
  normalizeDigits,
  isLuhnValid,
  detectCardBrand,
  isFutureExpiry,
  maskCardNumber,
  validateCardInput,
  validatePaymentMethodPayload,
  validateCheckoutPayload,
  validateVerifyPayload,
  validateRefundPayload,
  validateAdminManualPayload
}
