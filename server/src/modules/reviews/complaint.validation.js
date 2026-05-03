const mongoose = require('mongoose')
const Complaint = require('./complaint.model')

const MAX_SUBJECT_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_MESSAGE_LENGTH = 1000

const categoryMap = {
  'vehicle issue': 'vehicle',
  vehicle: 'vehicle',
  billing: 'billing',
  service: 'service',
  other: 'other'
}

const priorityMap = {
  low: 'low',
  medium: 'medium',
  med: 'medium',
  high: 'high'
}

const statusMap = {
  pending: 'pending',
  'under review': 'under_review',
  under_review: 'under_review',
  solved: 'solved'
}

const statusLabelMap = {
  pending: 'Pending',
  under_review: 'Under Review',
  solved: 'Solved'
}

const defaultStatusMessages = {
  pending: 'We have received your complaint and placed it in the pending queue.',
  under_review: 'We are reviewing your complaint and will update you after checking the booking details.',
  solved: 'Your complaint has been marked as solved. Thank you for your patience.'
}

const trimValue = (value = '') => String(value || '').trim()

const normalizeMappedValue = (value, map, fallback = '') => {
  const normalized = trimValue(value).toLowerCase()
  return map[normalized] || fallback
}

const validateObjectId = (value, label) => {
  const id = trimValue(value)

  if (!id) {
    return { error: `${label} is required` }
  }

  if (!mongoose.isValidObjectId(id)) {
    return { error: `Invalid ${label.toLowerCase()}` }
  }

  return { value: id }
}

const validateComplaintId = (complaintId) => validateObjectId(complaintId, 'Complaint ID')

const validateComplaintBookingId = (bookingId) => validateObjectId(bookingId, 'Booking ID')

const validateComplaintPayload = (body = {}) => {
  const bookingId = validateComplaintBookingId(body.bookingId || body.booking)
  if (bookingId.error) {
    return bookingId
  }

  const subject = trimValue(body.subject)
  const description = trimValue(body.description)
  const category = normalizeMappedValue(body.category, categoryMap)
  const priority = normalizeMappedValue(body.priority, priorityMap, 'low')
  const attachment = trimValue(body.attachment)

  if (!subject) {
    return { error: 'Subject is required' }
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    return { error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer` }
  }

  if (!description) {
    return { error: 'Description is required' }
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` }
  }

  if (!Complaint.COMPLAINT_CATEGORIES.includes(category)) {
    return { error: 'Invalid complaint category' }
  }

  if (!Complaint.COMPLAINT_PRIORITIES.includes(priority)) {
    return { error: 'Invalid complaint priority' }
  }

  return {
    bookingId: bookingId.value,
    subject,
    description,
    category,
    priority,
    attachment
  }
}

const validateComplaintStatusPayload = (body = {}) => {
  const status = normalizeMappedValue(body.status, statusMap)

  if (!Complaint.COMPLAINT_STATUSES.includes(status)) {
    return { error: 'Invalid complaint status' }
  }

  const notificationMessage = trimValue(body.message || body.notificationMessage || defaultStatusMessages[status])

  if (notificationMessage.length > MAX_MESSAGE_LENGTH) {
    return { error: `Complaint status message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }
  }

  return {
    status,
    statusLabel: statusLabelMap[status] || status,
    notificationMessage
  }
}

module.exports = {
  defaultStatusMessages,
  statusLabelMap,
  validateComplaintBookingId,
  validateComplaintId,
  validateComplaintPayload,
  validateComplaintStatusPayload
}
