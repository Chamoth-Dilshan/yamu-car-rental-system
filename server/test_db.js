const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

console.log('Testing connection to:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("SUCCESS: MongoDB Connected");
        process.exit(0);
    })
    .catch((err) => {
        console.error("FAILURE: Connection Error:", err);
        process.exit(1);
    });
