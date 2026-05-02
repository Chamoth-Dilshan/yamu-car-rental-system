const mongoose = require('mongoose')
const { VEHICLE_STATUSES } = require('../../utils/reservationHelpers')

const MAINTENANCE_TYPES = ['Routine Service', 'Repair', 'Inspection', 'Other']
const MAINTENANCE_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']
const ACTIVE_MAINTENANCE_STATUSES = ['scheduled', 'in_progress']

const maintenanceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  vehicleName: { type: String, required: true, trim: true },
  type: { type: String, enum: MAINTENANCE_TYPES, default: 'Routine Service' },
  count: { type: Number, default: 0, min: 0 },
  addedThings: { type: String, default: '', trim: true },
  inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', default: null },
  inventoryItemName: { type: String, default: '', trim: true },
  inventoryConsumed: { type: Boolean, default: false },
  status: { type: String, enum: MAINTENANCE_STATUSES, default: 'in_progress', index: true },
  totalCost: { type: Number, default: 0, min: 0 },
  previousVehicleStatus: { type: String, enum: VEHICLE_STATUSES, default: 'available' }
}, {
  timestamps: true
})

const Maintenance = mongoose.model('Maintenance', maintenanceSchema)

Maintenance.MAINTENANCE_TYPES = MAINTENANCE_TYPES
Maintenance.MAINTENANCE_STATUSES = MAINTENANCE_STATUSES
Maintenance.ACTIVE_MAINTENANCE_STATUSES = ACTIVE_MAINTENANCE_STATUSES

module.exports = Maintenance
