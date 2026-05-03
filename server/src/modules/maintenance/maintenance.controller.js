const { sendServerError } = require('../../utils/errorResponses')
const {
  ACTIVE_MAINTENANCE_STATUSES,
  listMaintenanceRecords,
  getMaintenanceRecordById: getMaintenanceRecordByIdService,
  createMaintenanceRecord: createMaintenanceRecordService,
  updateMaintenanceRecord: updateMaintenanceRecordService,
  deleteMaintenanceRecord: deleteMaintenanceRecordService
} = require('./maintenance.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const getMaintenanceRecords = async (req, res) => {
  try {
    const result = await listMaintenanceRecords({
      ownerId: req.user._id,
      ...req.query
    })

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load maintenance records')
  }
}

const getMaintenanceRecordById = async (req, res) => {
  try {
    const result = await getMaintenanceRecordByIdService({
      recordId: req.params.id,
      ownerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result.record)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load maintenance record')
  }
}

const createMaintenanceRecord = async (req, res) => {
  try {
    const result = await createMaintenanceRecordService({
      ownerId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to create maintenance record')
  }
}

const updateMaintenanceRecord = async (req, res) => {
  try {
    const result = await updateMaintenanceRecordService({
      recordId: req.params.id,
      ownerId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update maintenance record')
  }
}

const deleteMaintenanceRecord = async (req, res) => {
  try {
    const result = await deleteMaintenanceRecordService({
      recordId: req.params.id,
      ownerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json({ message: result.message })
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete maintenance record')
  }
}

module.exports = {
  ACTIVE_MAINTENANCE_STATUSES,
  getMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord
}
