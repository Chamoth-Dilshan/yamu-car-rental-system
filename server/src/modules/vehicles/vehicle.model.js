const mongoose = require('mongoose')
const { VEHICLE_STATUSES } = require('../../utils/reservationHelpers')

const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  featured: { type: Boolean, default: false },
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
})

module.exports = mongoose.model('Vehicle', vehicleSchema)
