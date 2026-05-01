//server/routes/vehicleRoutes.js
const express = require('express')
const router = express.Router()

const {
    createVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle
} = require('../src/modules/vehicles/vehicle.controller')

// Create vehicle
router.post('/', createVehicle)

// Get all vehicles
router.get('/', getAllVehicles)

// Get vehicle by ID
router.get('/:id', getVehicleById)

// Update vehicle
router.put('/:id', updateVehicle)

// Delete vehicle
router.delete('/:id', deleteVehicle)

module.exports = router