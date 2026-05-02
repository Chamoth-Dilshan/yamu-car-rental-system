const mongoose = require('mongoose')

const inventorySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '', trim: true }
}, {
  timestamps: true
})

module.exports = mongoose.model('Inventory', inventorySchema)
