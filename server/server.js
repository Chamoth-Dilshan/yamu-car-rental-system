//server/server.js
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

//Middleware
app.use(express.json())
app.use(cors())

//Vehicle Routes
const vehicleRoutes = require('./routes/vehicleRoutes')
app.use('/api/vehicles', vehicleRoutes)

//Maintenance Routes
const maintenanceRoutes = require('./routes/maintenanceRoutes');
app.use('/api/maintenance', maintenanceRoutes);

//Inventory Routes
const inventoryRoutes = require('./routes/inventoryRoutes');
app.use('/api/inventory', inventoryRoutes);

//Database connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.log("Connection Error:", err))

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})