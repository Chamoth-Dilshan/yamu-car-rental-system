const Complaint = require('./complaint.model')
const Booking = require('../reservations/booking.model')
const User = require('../users/user.model')
const { sendServerError } = require('../../utils/errorResponses')
const {
  getFileMetadataFromUpload,
  removeUploadedFiles,
  sendProtectedUpload
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

const createComplaint = async (req, res) => {
  try {
    const bookingId = req.body.bookingId || req.body.booking
    const booking = await Booking.findOne({ _id: bookingId, customer: req.user._id }).populate(bookingPopulate)

    if (!booking) {
      removeUploadedFiles([req.file])
      return res.status(404).json({ message: 'Booking not found' })
    }

    const subject = String(req.body.subject || '').trim()
    const description = String(req.body.description || '').trim()
    const category = normalizeMappedValue(req.body.category, categoryMap)
    const priority = normalizeMappedValue(req.body.priority, priorityMap, 'low')

    if (!subject) {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: 'Subject is required' })
    }

    if (!description) {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: 'Description is required' })
    }

    if (!Complaint.COMPLAINT_CATEGORIES.includes(category)) {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: 'Invalid complaint category' })
    }

    if (!Complaint.COMPLAINT_PRIORITIES.includes(priority)) {
      removeUploadedFiles([req.file])
      return res.status(400).json({ message: 'Invalid complaint priority' })
    }

    const complaint = await Complaint.create({
      customer: req.user._id,
      booking: booking._id,
      bookingNo: booking.bookingNo,
      subject,
      category,
      priority,
      description,
      attachment: req.file ? (req.file.originalname || req.file.filename) : String(req.body.attachment || '').trim(),
      attachmentFile: req.file ? getFileMetadataFromUpload(req.file, req.uploadDir) : {},
      statusHistory: [{
        status: 'pending',
        message: 'Complaint submitted by customer',
        updatedBy: req.user._id,
        updatedAt: new Date()
      }]
    })

    const populatedComplaint = await Complaint.findById(complaint._id).populate(complaintPopulate)

    await addNotificationToAdmins({
      type: 'complaint',
      title: 'New complaint submitted',
      message: `${req.user.fullName} submitted a complaint for booking ${booking.bookingNo}.`,
      link: '/admin/disputes'
    })

    res.status(201).json({
      message: 'Complaint submitted',
      complaint: serializeComplaint(populatedComplaint)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to submit complaint')
  }
}

const getComplaintAttachment = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    const isOwner = String(complaint.customer) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this attachment' })
    }

    if (!complaint.attachmentFile?.filePath) {
      return res.status(404).json({ message: 'Attachment not found' })
    }

    return sendProtectedUpload(res, complaint.attachmentFile)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load complaint attachment')
  }
}

const getAdminComplaints = async (_req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate(complaintPopulate)
      .sort({ createdAt: -1 })

    res.json({
      complaints: complaints.map(serializeComplaint),
      stats: buildComplaintStats(complaints)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load complaints')
  }
}

const updateComplaintStatus = async (req, res) => {
  try {
    const status = normalizeMappedValue(req.body.status, statusMap)
    if (!Complaint.COMPLAINT_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid complaint status' })
    }

    const complaint = await Complaint.findById(req.params.id)
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    const notificationMessage = String(req.body.message || req.body.notificationMessage || defaultStatusMessages[status]).trim()
    const statusLabel = statusLabelMap[status] || status

    complaint.status = status
    complaint.latestAdminMessage = notificationMessage
    complaint.lastStatusUpdatedBy = req.user._id
    complaint.lastStatusUpdatedAt = new Date()
    complaint.statusHistory.push({
      status,
      message: notificationMessage,
      updatedBy: req.user._id,
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

    res.json({
      message: 'Complaint status updated and customer notified',
      complaint: serializeComplaint(populatedComplaint)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to update complaint')
  }
}

const getComplaintStats = async (_req, res) => {
  try {
    const complaints = await Complaint.find().select('status')
    res.json(buildComplaintStats(complaints))
  } catch (error) {
    sendServerError(res, error, 'Failed to load complaint stats')
  }
}

const getMyComplaintContext = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.bookingId, customer: req.user._id }).populate(bookingPopulate)

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    const complaints = await Complaint.find({ booking: booking._id, customer: req.user._id })
      .populate(complaintPopulate)
      .sort({ createdAt: -1 })

    res.json({
      booking: serializeBooking(booking),
      complaints: complaints.map(serializeComplaint)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load complaint context')
  }
}

const findCustomerName = async (customerId) => {
  const customer = await User.findById(customerId).select('fullName')
  return customer?.fullName || 'Customer'
}

module.exports = {
  createComplaint,
  getComplaintAttachment,
  getAdminComplaints,
  updateComplaintStatus,
  getComplaintStats,
  getMyComplaintContext,
  findCustomerName,
  serializeComplaint,
  buildComplaintStats,
  statusLabelMap,
  defaultStatusMessages
}
