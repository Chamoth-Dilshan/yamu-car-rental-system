const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null }, // Null if standalone
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minBookingAmount: { type: Number, default: 0 },
  bookingType: { type: String, default: 'any' }, // 'with-driver', 'without-driver', 'any'
  vehicleCategory: { type: String, default: 'any' }, // mock category for testing
  firstTimeUserOnly: { type: Boolean, default: false },
  totalUsageLimit: { type: Number, default: 100 },
  perUserUsageLimit: { type: Number, default: 1 },
  usageCount: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  priority: { type: Number, default: 0 }, // higher applies first
  stackable: { type: Boolean, default: false } // can be used with other promo codes?
}, {
  timestamps: true
});

module.exports = mongoose.model('Promotion', promotionSchema);
