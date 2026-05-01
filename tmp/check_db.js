const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/ACER/Documents/GitHub/yamu-car-rental-system/server/.env' });

const MONGO_URI = process.env.MONGO_URI;

const inventorySchema = new mongoose.Schema({
    itemname: String,
    quantity: Number,
    price: Number,
    description: String
}, { collection: 'inventories' }); // Assuming 'inventories' based on project convention

const Inventory = mongoose.model('Inventory', inventorySchema);

async function checkDB() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected!');

        const latestItem = await Inventory.findOne({ itemname: 'DB Verification Part' });
        
        if (latestItem) {
            console.log('--- FOUND ITEM IN DB ---');
            console.log('ID:', latestItem._id);
            console.log('Name:', latestItem.itemname);
            console.log('Quantity:', latestItem.quantity);
            console.log('Price:', latestItem.price);
            console.log('Description:', latestItem.description);
        } else {
            console.log('Item not found in database.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDB();
