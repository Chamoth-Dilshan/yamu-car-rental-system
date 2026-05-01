const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Sends an email alert for low stock items
 * @param {Object} item - The inventory item object
 */
const sendLowStockAlert = async (item) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return;
    }

    const mailOptions = {
        from: `"YAMU Inventory System" <${process.env.EMAIL_USER}>`,
        to: process.env.ALERT_RECEIVER || process.env.EMAIL_USER,
        subject: `⚠️ LOW STOCK ALERT: ${item.itemname.toUpperCase()}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #d32f2f;">Inventory Alert</h2>
                <p>The following item has dropped below the safety threshold (10 units):</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; color: #444;">
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; background: #fafafa; width: 30%;"><strong>Item Name</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.itemname}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; background: #fafafa;"><strong>Quantity Left</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #d32f2f; font-weight: bold;">${item.quantity} Units (Critical Low)</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; background: #fafafa;"><strong>Unit Price</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">Rs. ${item.price?.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; background: #fafafa;"><strong>Description</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description || 'No description provided'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; background: #fafafa;"><strong>System ID</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${item._id}</td>
                    </tr>
                </table>
                <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                    Please login to the YAMU Dashboard to restock this item.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Failed to send low stock email:', error);
    }
};

module.exports = { sendLowStockAlert };
