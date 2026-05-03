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
const {
  defaultStatusMessages,
  statusLabelMap,
  validateComplaintBookingId,
  validateComplaintId,
  validateComplaintPayload,
  validateComplaintStatusPayload
} = require('./complaint.validation')

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

const toPlain = (value) => (value?.toObject ? value.toObject() : value)

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
  const validatedComplaint = validateComplaintPayload(body)
  if (validatedComplaint.error) {
    return cleanupAndReturn(file, { error: validatedComplaint.error, statusCode: 400 })
  }

  const booking = await Booking.findOne({ _id: validatedComplaint.bookingId, customer: customer._id }).populate(bookingPopulate)

  if (!booking) {
    return cleanupAndReturn(file, { error: 'Booking not found', statusCode: 404 })
  }

  const complaint = await Complaint.create({
    customer: customer._id,
    booking: booking._id,
    bookingNo: booking.bookingNo,
    subject: validatedComplaint.subject,
    category: validatedComplaint.category,
    priority: validatedComplaint.priority,
    description: validatedComplaint.description,
    attachment: file ? (file.originalname || file.filename) : validatedComplaint.attachment,
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
  const complaintIdValidation = validateComplaintId(complaintId)
  if (complaintIdValidation.error) {
    return { error: complaintIdValidation.error, statusCode: 400 }
  }

  const complaint = await Complaint.findById(complaintIdValidation.value)

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
  const complaintIdValidation = validateComplaintId(complaintId)
  if (complaintIdValidation.error) {
    return { error: complaintIdValidation.error, statusCode: 400 }
  }

  const statusValidation = validateComplaintStatusPayload(body)
  if (statusValidation.error) {
    return { error: statusValidation.error, statusCode: 400 }
  }

  const complaint = await Complaint.findById(complaintIdValidation.value)
  if (!complaint) {
    return { error: 'Complaint not found', statusCode: 404 }
  }

  complaint.status = statusValidation.status
  complaint.latestAdminMessage = statusValidation.notificationMessage
  complaint.lastStatusUpdatedBy = adminId
  complaint.lastStatusUpdatedAt = new Date()
  complaint.statusHistory.push({
    status: statusValidation.status,
    message: statusValidation.notificationMessage,
    updatedBy: adminId,
    updatedAt: new Date()
  })
  await complaint.save()

  await addNotificationToUser(complaint.customer, {
    type: 'complaint',
    title: `Complaint Update: ${statusValidation.statusLabel}`,
    message: statusValidation.notificationMessage,
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
  const bookingIdValidation = validateComplaintBookingId(bookingId)
  if (bookingIdValidation.error) {
    return { error: bookingIdValidation.error, statusCode: 400 }
  }

  const booking = await Booking.findOne({ _id: bookingIdValidation.value, customer: customerId }).populate(bookingPopulate)

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
