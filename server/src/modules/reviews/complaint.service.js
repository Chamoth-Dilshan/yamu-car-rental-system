const Complaint = require('./complaint.model')
const Booking = require('../reservations/booking.model')
const User = require('../users/user.model')
const {
  getFileMetadataFromUpload,
  removeUploadedFiles
} = require('../../utils/fileHelpers')
const { serializeBooking } = require('../../utils/reservationHelpers')
const {
  addNotificationToAdmins,
  addNotificationToUser
} = require('../../utils/notificationHelpers')

const complaintPopulate = [
  { path: 'customer', select: 'fullName email phone profilePic' },
  { path: 'booking', select: 'bookingNo bookingType bookingStatus serviceTitle vehicleLabel startDate endDate totalAmount' },
  { path: 'lastStatusUpdatedBy', select: 'fullName email' }
]

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

const toPlain = (value) => (value?.toObject ? value.toObject() : value)

const normalizeMappedValue = (value, map, fallback = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  return map[normalized] || fallback
}

const serializeComplaint = (complaint) => {
  const rawComplaint = toPlain(complaint)

  return {
    _id: rawComplaint._id,
    customer: rawComplaint.customer,
    booking: rawComplaint.booking,
    bookingNo: rawComplaint.bookingNo,
    subject: rawComplaint.subject,
    category: rawComplaint.category,
    priority: rawComplaint.priority,
    description: rawComplaint.description,
    attachment: rawComplaint.attachment || '',
    attachmentFile: rawComplaint.attachmentFile || {},
    status: rawComplaint.status,
    statusLabel: statusLabelMap[rawComplaint.status] || rawComplaint.status,
    latestAdminMessage: rawComplaint.latestAdminMessage || '',
    lastStatusUpdatedBy: rawComplaint.lastStatusUpdatedBy || null,
    lastStatusUpdatedAt: rawComplaint.lastStatusUpdatedAt || null,
    statusHistory: rawComplaint.statusHistory || [],
    createdAt: rawComplaint.createdAt,
    updatedAt: rawComplaint.updatedAt
  }
}

const buildComplaintStats = (complaints = []) => {
  const solvedCount = complaints.filter((complaint) => complaint.status === 'solved').length

  return {
    totalComplaints: complaints.length,
    solvedComplaints: solvedCount,
    pendingComplaints: complaints.filter((complaint) => complaint.status === 'pending').length,
    underReviewComplaints: complaints.filter((complaint) => complaint.status === 'under_review').length,
    resolutionRate: complaints.length ? Math.round((solvedCount / complaints.length) * 100) : 0
  }
}

const cleanupAndReturn = (file, result) => {
  removeUploadedFiles([file])
  return result
}

const createComplaint = async ({ customer, body, file, uploadDir }) => {
  const bookingId = body.bookingId || body.booking
  const booking = await Booking.findOne({ _id: bookingId, customer: customer._id }).populate(bookingPopulate)

  if (!booking) {
    return cleanupAndReturn(file, { error: 'Booking not found', statusCode: 404 })
  }

  const subject = String(body.subject || '').trim()
  const description = String(body.description || '').trim()
  const category = normalizeMappedValue(body.category, categoryMap)
  const priority = normalizeMappedValue(body.priority, priorityMap, 'low')

  if (!subject) {
    return cleanupAndReturn(file, { error: 'Subject is required', statusCode: 400 })
  }

  if (!description) {
    return cleanupAndReturn(file, { error: 'Description is required', statusCode: 400 })
  }

  if (!Complaint.COMPLAINT_CATEGORIES.includes(category)) {
    return cleanupAndReturn(file, { error: 'Invalid complaint category', statusCode: 400 })
  }

  if (!Complaint.COMPLAINT_PRIORITIES.includes(priority)) {
    return cleanupAndReturn(file, { error: 'Invalid complaint priority', statusCode: 400 })
  }

  const complaint = await Complaint.create({
    customer: customer._id,
    booking: booking._id,
    bookingNo: booking.bookingNo,
    subject,
    category,
    priority,
    description,
    attachment: file ? (file.originalname || file.filename) : String(body.attachment || '').trim(),
    attachmentFile: file ? getFileMetadataFromUpload(file, uploadDir) : {},
    statusHistory: [{
      status: 'pending',
      message: 'Complaint submitted by customer',
      updatedBy: customer._id,
      updatedAt: new Date()
    }]
  })

  const populatedComplaint = await Complaint.findById(complaint._id).populate(complaintPopulate)

  await addNotificationToAdmins({
    type: 'complaint',
    title: 'New complaint submitted',
    message: `${customer.fullName} submitted a complaint for booking ${booking.bookingNo}.`,
    link: '/admin/disputes'
  })

  return {
    message: 'Complaint submitted',
    complaint: serializeComplaint(populatedComplaint)
  }
}

const getComplaintAttachment = async ({ complaintId, user }) => {
  const complaint = await Complaint.findById(complaintId)

  if (!complaint) {
    return { error: 'Complaint not found', statusCode: 404 }
  }

  const isOwner = String(complaint.customer) === String(user._id)
  const isAdmin = user.role === 'admin'

  if (!isOwner && !isAdmin) {
    return { error: 'Not authorized to view this attachment', statusCode: 403 }
  }

  if (!complaint.attachmentFile?.filePath) {
    return { error: 'Attachment not found', statusCode: 404 }
  }

  return { attachmentFile: complaint.attachmentFile }
}

const listAdminComplaints = async () => {
  const complaints = await Complaint.find()
    .populate(complaintPopulate)
    .sort({ createdAt: -1 })

  return {
    complaints: complaints.map(serializeComplaint),
    stats: buildComplaintStats(complaints)
  }
}

const updateComplaintStatus = async ({ complaintId, adminId, body }) => {
  const status = normalizeMappedValue(body.status, statusMap)
  if (!Complaint.COMPLAINT_STATUSES.includes(status)) {
    return { error: 'Invalid complaint status', statusCode: 400 }
  }

  const complaint = await Complaint.findById(complaintId)
  if (!complaint) {
    return { error: 'Complaint not found', statusCode: 404 }
  }

  const notificationMessage = String(body.message || body.notificationMessage || defaultStatusMessages[status]).trim()
  const statusLabel = statusLabelMap[status] || status

  complaint.status = status
  complaint.latestAdminMessage = notificationMessage
  complaint.lastStatusUpdatedBy = adminId
  complaint.lastStatusUpdatedAt = new Date()
  complaint.statusHistory.push({
    status,
    message: notificationMessage,
    updatedBy: adminId,
    updatedAt: new Date()
  })
  await complaint.save()

  await addNotificationToUser(complaint.customer, {
    type: 'complaint',
    title: `Complaint Update: ${statusLabel}`,
    message: notificationMessage,
    link: '/notifications'
  })

  const populatedComplaint = await Complaint.findById(complaint._id).populate(complaintPopulate)

  return {
    message: 'Complaint status updated and customer notified',
    complaint: serializeComplaint(populatedComplaint)
  }
}

const getComplaintStats = async () => {
  const complaints = await Complaint.find().select('status')
  return buildComplaintStats(complaints)
}

const getComplaintContext = async ({ bookingId, customerId }) => {
  const booking = await Booking.findOne({ _id: bookingId, customer: customerId }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Booking not found', statusCode: 404 }
  }

  const complaints = await Complaint.find({ booking: booking._id, customer: customerId })
    .populate(complaintPopulate)
    .sort({ createdAt: -1 })

  return {
    booking: serializeBooking(booking),
    complaints: complaints.map(serializeComplaint)
  }
}

const findCustomerName = async (customerId) => {
  const customer = await User.findById(customerId).select('fullName')
  return customer?.fullName || 'Customer'
}

module.exports = {
  createComplaint,
  getComplaintAttachment,
  listAdminComplaints,
  updateComplaintStatus,
  getComplaintStats,
  getComplaintContext,
  findCustomerName,
  serializeComplaint,
  buildComplaintStats,
  statusLabelMap,
  defaultStatusMessages
}
