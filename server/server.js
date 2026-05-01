//server/server.js
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const dns = require('dns')

// Use Google DNS to resolve MongoDB SRV records if default DNS fails
dns.setServers(['8.8.8.8', '8.8.4.4'])

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

//Middleware
app.use(express.json())
app.use(cors())

// Auth Routes
const authRoutes = require('./src/modules/auth/auth.routes')
app.use('/api/auth', authRoutes)

// User Routes
const userRoutes = require('./src/modules/users/user.routes')
app.use('/api/users', userRoutes)

// Vehicle Routes
const vehicleRoutes = require('./routes/vehicleRoutes')
app.use('/api/vehicles', vehicleRoutes)

// Maintenance Routes
const maintenanceRoutes = require('./routes/maintenanceRoutes');
app.use('/api/maintenance', maintenanceRoutes);

// Inventory Routes
const inventoryRoutes = require('./routes/inventoryRoutes');
app.use('/api/inventory', inventoryRoutes);

// Booking Routes
const bookingRoutes = require('./src/modules/reservations/booking.routes')
app.use('/api/bookings', bookingRoutes)

// Admin Routes
const adminRoutes = require('./src/modules/admin/admin.routes')
app.use('/api/admin', adminRoutes)

//Database connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.log("Connection Error:", err))

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})
