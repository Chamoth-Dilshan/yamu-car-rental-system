//server/routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const {
    createMaintenance,
    getAllMaintenance,
    getMaintenanceById,
    updateMaintenance,
    deleteMaintenance
} = require('../src/modules/admin/maintenanceController');

router.post('/', createMaintenance);
router.get('/', getAllMaintenance);
router.get('/:id', getMaintenanceById);
router.put('/:id', updateMaintenance);
router.delete('/:id', deleteMaintenance);

module.exports = router;