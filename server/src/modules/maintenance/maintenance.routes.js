const express = require('express')
const {
  getMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord
} = require('./maintenance.controller')
const {
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} = require('./inventory.controller')
const { protect, authorize } = require('../../middleware/auth.middleware')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'maintenance',
    message: 'maintenance module ready'
  })
})

router.get('/inventory', protect, authorize('staff'), getInventoryItems)
router.post('/inventory', protect, authorize('staff'), createInventoryItem)
router.get('/inventory/:id', protect, authorize('staff'), getInventoryItemById)
router.put('/inventory/:id', protect, authorize('staff'), updateInventoryItem)
router.delete('/inventory/:id', protect, authorize('staff'), deleteInventoryItem)

router.get('/', protect, authorize('staff'), getMaintenanceRecords)
router.post('/', protect, authorize('staff'), createMaintenanceRecord)
router.get('/:id', protect, authorize('staff'), getMaintenanceRecordById)
router.put('/:id', protect, authorize('staff'), updateMaintenanceRecord)
router.delete('/:id', protect, authorize('staff'), deleteMaintenanceRecord)

module.exports = router
