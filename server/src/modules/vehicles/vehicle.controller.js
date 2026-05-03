const { sendServerError } = require('../../utils/errorResponses')
const {
  listPublicVehicles,
  getPublicVehicleById,
  listOwnerVehicles,
  createVehicle: createVehicleService,
  updateVehicle: updateVehicleService,
  deleteVehicle: deleteVehicleService
} = require('./vehicle.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const getVehicles = async (req, res) => {
  try {
    const result = await listPublicVehicles(req.query)
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load vehicles')
  }
}

const getVehicleById = async (req, res) => {
  try {
    const result = await getPublicVehicleById(req.params.id)

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result.vehicle)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load vehicle details')
  }
}

const getMyVehicles = async (req, res) => {
  try {
    const result = await listOwnerVehicles({
      ownerId: req.user._id,
      ...req.query
    })

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load your vehicles')
  }
}

const createVehicle = async (req, res) => {
  try {
    const result = await createVehicleService({
      owner: req.user,
      body: req.body,
      files: req.files || []
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to create vehicle')
  }
}

const updateVehicle = async (req, res) => {
  try {
    const result = await updateVehicleService({
      vehicleId: req.params.id,
      owner: req.user,
      body: req.body,
      files: req.files || []
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update vehicle')
  }
}

const deleteVehicle = async (req, res) => {
  try {
    const result = await deleteVehicleService({
      vehicleId: req.params.id,
      ownerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json({ message: result.message })
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete vehicle')
  }
}

module.exports = {
  getVehicles,
  getVehicleById,
  getMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle
}
