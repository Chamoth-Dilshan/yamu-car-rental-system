const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const url = process.env.MONGO_URI || "mongodb://localhost:27017/yamu_car_rental";

async function check() {
    try {
        await mongoose.connect(url);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
        const vehicles = await Vehicle.find();
        console.log("Total Vehicles:", vehicles.length);
        console.log(JSON.stringify(vehicles, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
