const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const path = require('path')

const errorMiddleware = require('./middleware/error.middleware')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', require('./modules/auth/auth.routes'))
app.use('/api/users', require('./modules/users/user.routes'))
app.use('/api/admin', require('./modules/admin/admin.routes'))
app.use('/api/vehicles', require('./modules/vehicles/vehicle.routes'))
app.use('/api/driver-ads', require('./modules/drivers/driverAd.routes'))
app.use('/api/bookings', require('./modules/reservations/booking.routes'))
app.use('/api/payments', require('./modules/payments/payment.routes'))
app.use('/api/reviews', require('./modules/reviews/review.routes'))
app.use('/api/maintenance', require('./modules/maintenance/maintenance.routes'))
app.use('/api/promotions', require('./modules/promotions/promotion.routes'))

app.get('/api/health', (req, res) => {
  const readyStateLabels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }

  res.json({
    status: readyStateLabels[mongoose.connection.readyState] === 'connected' ? 'ok' : 'degraded',
    message: 'Reservation, profile, and role management API is running',
    database: readyStateLabels[mongoose.connection.readyState] || 'unknown'
  })
})

app.use(errorMiddleware)

module.exports = app
