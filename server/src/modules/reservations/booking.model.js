const mongoose = require('mongoose')
const {
  BOOKING_TYPES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES
} = require('../../utils/reservationHelpers')

const bookingSchema = new mongoose.Schema({
  bookingNo: { type: String, required: true, unique: true },
  bookingType: { type: String, enum: BOOKING_TYPES, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  driverAd: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverAd', default: null },
  serviceTitle: { type: String, default: '' },
  vehicleLabel: { type: String, default: '' },
  pickupLocation: { type: String, default: '' },
  destination: { type: String, default: '' },
  notes: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  dailyRate: { type: Number, required: true, min: 0 },
  billableDays: { type: Number, required: true, min: 1 },
  baseAmount: { type: Number, required: true, min: 0 },
  serviceFee: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
  bookingStatus: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
  adminNote: { type: String, default: '' },
  driverResponseNote: { type: String, default: '' }
}, {
  timestamps: true
})

module.exports = mongoose.model('Booking', bookingSchema)
