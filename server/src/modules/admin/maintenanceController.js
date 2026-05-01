//server/cpntrollers/maintenanceController.js
const Maintenance = require('../maintenance/maintenance.model');

// @desc    Record new maintenance
// @route   POST /api/maintenance
exports.createMaintenance = async (req, res) => {
    try {
        const maintenance = new Maintenance(req.body);
        const savedRecord = await maintenance.save();
        res.status(201).json(savedRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all maintenance records
// @route   GET /api/maintenance
exports.getAllMaintenance = async (req, res) => {
    try {
        const records = await Maintenance.find().sort({ createdAt: -1 });
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single maintenance record
// @route   GET /api/maintenance/:id
exports.getMaintenanceById = async (req, res) => {
    try {
        const record = await Maintenance.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Record not found' });
        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update maintenance record
// @route   PUT /api/maintenance/:id
exports.updateMaintenance = async (req, res) => {
    try {
        const updatedRecord = await Maintenance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedRecord) return res.status(404).json({ message: 'Record not found' });
        res.status(200).json(updatedRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete maintenance record
// @route   DELETE /api/maintenance/:id
exports.deleteMaintenance = async (req, res) => {
    try {
        const deletedRecord = await Maintenance.findByIdAndDelete(req.params.id);
        if (!deletedRecord) return res.status(404).json({ message: 'Record not found' });
        res.status(200).json({ message: 'Maintenance record deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};