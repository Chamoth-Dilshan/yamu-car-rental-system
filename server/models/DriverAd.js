const mongoose = require('mongoose')
const { DRIVER_AD_AVAILABILITY, DRIVER_AD_VISIBILITY } = require('../utils/reservationHelpers')

const driverAdSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  tagline: { type: String, default: '' },
  serviceLocation: { type: String, default: '' },
  languages: [{ type: String, trim: true }],
  experienceYears: { type: Number, default: 0, min: 0 },
  dailyRate: { type: Number, required: true, min: 0 },
  maxGroupSize: { type: Number, default: 1, min: 1 },
  availability: { type: String, enum: DRIVER_AD_AVAILABILITY, default: 'available' },
  visibility: { type: String, enum: DRIVER_AD_VISIBILITY, default: 'active' },
  preferredContact: { type: String, default: '' },
  specialties: [{ type: String, trim: true }],
  description: { type: String, default: '' },
  photo: { type: String, default: '' },
  completedTrips: { type: Number, default: 0, min: 0 },
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
})

module.exports = mongoose.model('DriverAd', driverAdSchema)
