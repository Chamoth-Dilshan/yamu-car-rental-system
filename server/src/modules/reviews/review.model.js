const mongoose = require('mongoose')

const REVIEW_STATUSES = ['pending', 'approved', 'rejected']

const reviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  bookingNo: { type: String, required: true, trim: true },
  bookingType: { type: String, enum: ['vehicle', 'driver'], required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  driverAd: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverAd', default: null },
  passengerName: { type: String, required: true, trim: true },
  driverName: { type: String, default: '', trim: true },
  vehicleName: { type: String, default: '', trim: true },
  vehicleRating: { type: Number, min: 1, max: 5, default: null },
  driverRating: { type: Number, min: 1, max: 5, default: null },
  feedback: { type: String, required: true, trim: true },
  status: { type: String, enum: REVIEW_STATUSES, default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' }
}, {
  timestamps: true
})

module.exports = mongoose.model('Review', reviewSchema)
module.exports.REVIEW_STATUSES = REVIEW_STATUSES
