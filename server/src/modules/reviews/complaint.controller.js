const { sendServerError } = require('../../utils/errorResponses')
const { sendProtectedUpload } = require('../../utils/fileHelpers')
const {
  createComplaint: createComplaintService,
  getComplaintAttachment: getComplaintAttachmentService,
  listAdminComplaints,
  updateComplaintStatus: updateComplaintStatusService,
  getComplaintStats: getComplaintStatsService,
  getComplaintContext,
  findCustomerName,
  serializeComplaint,
  buildComplaintStats,
  statusLabelMap,
  defaultStatusMessages
} = require('./complaint.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const createComplaint = async (req, res) => {
  try {
    const result = await createComplaintService({
      customer: req.user,
      body: req.body,
      file: req.file,
      uploadDir: req.uploadDir
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to submit complaint')
  }
}

const getComplaintAttachment = async (req, res) => {
  try {
    const result = await getComplaintAttachmentService({
      complaintId: req.params.id,
      user: req.user
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return sendProtectedUpload(res, result.attachmentFile)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load complaint attachment')
  }
}

const getAdminComplaints = async (_req, res) => {
  try {
    const result = await listAdminComplaints()
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load complaints')
  }
}

const updateComplaintStatus = async (req, res) => {
  try {
    const result = await updateComplaintStatusService({
      complaintId: req.params.id,
      adminId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update complaint')
  }
}

const getComplaintStats = async (_req, res) => {
  try {
    const result = await getComplaintStatsService()
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load complaint stats')
  }
}

const getMyComplaintContext = async (req, res) => {
  try {
    const result = await getComplaintContext({
      bookingId: req.params.bookingId,
      customerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load complaint context')
  }
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
