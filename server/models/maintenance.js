//server/models/maintenance.js
const mongoose = require('mongoose')

const maintenanceSchema = new mongoose.Schema({
    
    vehiclename: { type: String, required: true},
    type: { type: String, required: true },
    count: { type: Number, required: true},
    addedthings: { type: String, required: true },
    status: { type: String, required: true },
    totcost: { type: Number, required: true },
    }, { timestamps: true })

module.exports = mongoose.model('Maintenance', maintenanceSchema);