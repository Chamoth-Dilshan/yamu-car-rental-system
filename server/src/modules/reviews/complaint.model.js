const mongoose = require('mongoose')

const COMPLAINT_CATEGORIES = ['vehicle', 'billing', 'service', 'other']
const COMPLAINT_PRIORITIES = ['low', 'medium', 'high']
const COMPLAINT_STATUSES = ['pending', 'under_review', 'solved']

const complaintStatusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: COMPLAINT_STATUSES, required: true },
  message: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false })

const attachmentFileSchema = new mongoose.Schema({
  fileName: { type: String, default: '' },
  filePath: { type: String, default: '' },
  reference: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: null }
}, { _id: false })

const complaintSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  bookingNo: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
  priority: { type: String, enum: COMPLAINT_PRIORITIES, default: 'low' },
  description: { type: String, required: true, trim: true },
  attachment: { type: String, default: '' },
  attachmentFile: {
    type: attachmentFileSchema,
    default: () => ({})
  },
  status: { type: String, enum: COMPLAINT_STATUSES, default: 'pending' },
  latestAdminMessage: { type: String, default: '' },
  lastStatusUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastStatusUpdatedAt: { type: Date, default: null },
  statusHistory: [complaintStatusHistorySchema]
}, {
  timestamps: true
})

module.exports = mongoose.model('Complaint', complaintSchema)
module.exports.COMPLAINT_CATEGORIES = COMPLAINT_CATEGORIES
module.exports.COMPLAINT_PRIORITIES = COMPLAINT_PRIORITIES
module.exports.COMPLAINT_STATUSES = COMPLAINT_STATUSES
