//server/src/modules/admin/inventory.model.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    itemname: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    description: { type: String },
}, { timestamps: true })

module.exports = mongoose.model('Inventory', inventorySchema);
