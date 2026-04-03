export const formatCurrency = (value) => (
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
)

export const formatDate = (value) => {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}

export const formatDateTime = (value) => {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

export const formatDateRange = (startDate, endDate) => {
  if (!startDate) {
    return 'Dates pending'
  }

  const startLabel = formatDate(startDate)
  const endLabel = endDate ? formatDate(endDate) : startLabel

  return `${startLabel} - ${endLabel}`
}

export const formatList = (items = [], fallback = 'Not specified') => {
  const values = Array.isArray(items) ? items.filter(Boolean) : []
  return values.length ? values.join(', ') : fallback
}

const badgeMap = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-danger',
  closed: 'badge-info',
  paid: 'badge-success',
  refunded: 'badge-danger',
  active: 'badge-success',
  available: 'badge-success',
  limited: 'badge-warning',
  unavailable: 'badge-danger',
  draft: 'badge-warning',
  paused: 'badge-danger',
  maintenance: 'badge-warning',
  reserved: 'badge-info',
  inactive: 'badge-danger'
}

export const getBadgeClass = (status) => badgeMap[status] || 'badge-info'
