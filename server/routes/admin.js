const express = require('express');
const { getAllUsers, updateUser, reviewProviderApplication, deleteUser } = require('../controllers/adminController')
const {
  getAdminBookings,
  updateAdminBooking,
  deleteAdminBooking
} = require('../controllers/adminBookingController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(protect, authorize('admin'))

router.get('/users', getAllUsers)
router.put('/users/:id', updateUser)
router.put('/users/:id/applications/:roleKey/review', reviewProviderApplication)
router.delete('/users/:id', deleteUser)
router.get('/bookings', getAdminBookings)
router.put('/bookings/:id', updateAdminBooking)
router.delete('/bookings/:id', deleteAdminBooking)

module.exports = router

