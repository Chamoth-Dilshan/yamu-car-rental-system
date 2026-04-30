//server/controllers/vehicleController.js
const Vehicle = require('../models/vehicle')

// @desc    Create a new vehicle
// @route   POST /api/vehicles
exports.createVehicle = async (req, res) => {
    try {
        const vehicle = new Vehicle(req.body)
        const savedVehicle = await vehicle.save()
        console.log("POST /api/vehicles hit");
        console.log(req.body);
        res.status(201).json(savedVehicle)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

// @desc    Get all vehicles
// @route   GET /api/vehicles
exports.getAllVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find()
        res.status(200).json(vehicles)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// @desc    Get single vehicle by ID
// @route   GET /api/vehicles/:id
exports.getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id)

        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' })
        }

        res.status(200).json(vehicle)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
exports.updateVehicle = async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )

        if (!updatedVehicle) {
            return res.status(404).json({ message: 'Vehicle not found' })
        }

        res.status(200).json(updatedVehicle)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
exports.deleteVehicle = async (req, res) => {
    try {
        const deletedVehicle = await Vehicle.findByIdAndDelete(req.params.id)

        if (!deletedVehicle) {
            return res.status(404).json({ message: 'Vehicle not found' })
        }

        res.status(200).json({ message: 'Vehicle deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}