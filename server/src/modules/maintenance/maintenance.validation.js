const normalizeMaintenanceStatus = (value = 'in_progress') => {
  const normalizedValue = String(value || 'in_progress')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  const aliases = {
    pending: 'scheduled',
    ongoing: 'in_progress',
    progress: 'in_progress',
    maintenance: 'in_progress',
    complete: 'completed',
    done: 'completed',
    canceled: 'cancelled'
  }

  return aliases[normalizedValue] || normalizedValue
}

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

const hasBodyField = (body, field) => Object.prototype.hasOwnProperty.call(body, field)

module.exports = {
  normalizeMaintenanceStatus,
  toNumber,
  hasBodyField
}
