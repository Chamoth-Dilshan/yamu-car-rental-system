// server/test_email.js
const { sendLowStockAlert } = require('./utils/emailService');
require('dotenv').config();

const testAlert = async () => {
    console.log("--- EMAIL SYSTEM DIAGNOSTIC ---");
    
    // Check Env
    const config = {
        user: process.env.EMAIL_USER ? "✅ SET" : "❌ NOT SET",
        pass: process.env.EMAIL_PASS ? "✅ SET" : "❌ NOT SET",
        receiver: process.env.ALERT_RECEIVER ? "✅ SET" : "⚠️ NOT SET (Will use sender email)"
    }
    
    console.table(config);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("\n❌ ERROR: Please fill EMAIL_USER and EMAIL_PASS in your .env file first!");
        process.exit(1);
    }

    console.log("\n🚀 Attempting to send test alert...");
    
    const mockItem = {
        _id: "TEST-ITEM-123",
        itemname: "Diagnostic Test Item",
        quantity: 5
    };

    try {
        await sendLowStockAlert(mockItem);
        console.log("\n✅ SUCCESS: If you don't see errors above, check your inbox!");
    } catch (err) {
        console.error("\n❌ FAILED TO SEND:", err.message);
    }
};

testAlert();
