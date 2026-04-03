const Vehicle = require('../models/Vehicle')
const { sendServerError } = require('../utils/errorResponses')
const { serializeVehicle } = require('../utils/reservationHelpers')

const getVehicles = async (req, res) => {
  try {
    const { search = '', status, featured, limit } = req.query
    const query = {}

    if (status && status !== 'all') {
      query.status = status
    }

    if (featured === 'true') {
      query.featured = true
    }

    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [
        { name: regex },
        { brand: regex },
        { model: regex },
        { category: regex },
        { location: regex },
        { vehicleCode: regex }
      ]
    }

    const vehicleQuery = Vehicle.find(query).sort({ featured: -1, createdAt: -1 })

    if (limit) {
      vehicleQuery.limit(Number(limit))
    }

    const vehicles = await vehicleQuery

    res.json({
      vehicles: vehicles.map(serializeVehicle)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load vehicles')
  }
}

const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    res.json(serializeVehicle(vehicle))
  } catch (error) {
    sendServerError(res, error, 'Failed to load vehicle details')
  }
}

module.exports = {
  getVehicles,
  getVehicleById
}
