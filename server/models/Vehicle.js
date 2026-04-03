const mongoose = require('mongoose')
const { VEHICLE_STATUSES } = require('../utils/reservationHelpers')

const vehicleSchema = new mongoose.Schema({
  vehicleCode: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  category: { type: String, default: '' },
  fuelType: { type: String, required: true, trim: true },
  transmission: { type: String, required: true, trim: true },
  seats: { type: Number, required: true, min: 1 },
  location: { type: String, required: true, trim: true },
  engineCapacity: { type: String, default: '' },
  ownerContact: { type: String, default: '' },
  description: { type: String, default: '' },
  features: [{ type: String, trim: true }],
  images: [{ type: String, trim: true }],
  pricePerDay: { type: Number, required: true, min: 0 },
  status: { type: String, enum: VEHICLE_STATUSES, default: 'available' },
  featured: { type: Boolean, default: false }
}, {
  timestamps: true
})

module.exports = mongoose.model('Vehicle', vehicleSchema)
