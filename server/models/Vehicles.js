// server/models/vehicles.js
const mongoose = require('mongoose')

const vehicleSchema = new mongoose.Schema({

    _id: { type: String, required: true},
    ownerName: { type: String, required: true },
    imgUrl: { type: String, required: true },
    phone: { type: String, required: true},
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    fuel: { type: String, required: true, },
    transmission: { type: String,  required: true },
    seats: { type: Number, required: true, min: 1 },
    distance: { type: Number, required: true, min: 0 },
    pricePerDay: { type: Number, required: true, min: 0 },
    availability: { type: String, default: true },
    }, { timestamps: true })

module.exports = mongoose.model('Vehicle', vehicleSchema)
    
    // _id: { type: String, required: true, unique: true },
    // owner: { type: String, required: true },

    // phone: { 
    //     type: Number, 
    //     required: true,
    //     validate: {
    //         validator: function(v) {
    //             // Checks if the string is exactly 10 digits (0-9)
    //             return /^\d{10}$/.test(v);
    //         },
    //         message: props => `${props.value} is not a valid 10-digit phone number!`
    //     }
    // },

    // brand: { type: String, required: true },
    // model: { type: String, required: true },
    // year: { type: Number, required: true },

    // fuel: { 
    //     type: String, 
    //     required: true,
    //     enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid']
    // },

    // transmission: { 
    //     type: String, 
    //     required: true,
    //     enum: ['Manual', 'Automatic']
    // },

    // seats: { type: Number, required: true, min: 1 },
    // distance: { type: Number, required: true, min: 0 },
    // pricePerDay: { type: Number, required: true, min: 0 },
    // availability: { type: Boolean, default: true },
    // }, { timestamps: true })

