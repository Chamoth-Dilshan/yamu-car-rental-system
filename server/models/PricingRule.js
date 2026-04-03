const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ruleType: { 
    type: String, 
    enum: ['weekend', 'holiday', 'long-duration', 'demand', 'custom'], 
    required: true 
  },
  adjustmentType: { type: String, enum: ['percentage', 'fixed'], required: true },
  adjustmentDirection: { type: String, enum: ['increase', 'decrease'], required: true },
  adjustmentValue: { type: Number, required: true },
  conditions: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g., { minDays: 7, daysOfWeek: [0, 6] }
  priority: { type: Number, default: 0 }, // Order in which rules are applied
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  startDate: { type: Date }, // Optional: only apply within this window
  endDate: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
