export const normalizeDigits = (value = '') => String(value || '').replace(/\D/g, '')

export const formatCardNumber = (value = '') => (
  normalizeDigits(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
)

export const isSixteenDigitCardNumber = (value = '') => {
  const digits = normalizeDigits(value)
  return /^\d{16}$/.test(digits)
}

export const isFutureExpiry = (month, year) => {
  const monthNumber = Number(month)
  const yearNumber = Number(year)

  if (!monthNumber || monthNumber < 1 || monthNumber > 12 || !yearNumber) {
    return false
  }

  const expiryDate = new Date(Date.UTC(yearNumber, monthNumber, 0, 23, 59, 59, 999))
  return expiryDate >= new Date()
}

export const isSecurityCodeValid = (value = '') => /^\d{3,4}$/.test(normalizeDigits(value))
