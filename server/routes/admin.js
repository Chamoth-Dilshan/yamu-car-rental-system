const express = require('express');
const { getAllUsers, updateUser, reviewProviderApplication, deleteUser } = require('../controllers/adminController')
const {
  getAdminBookings,
  updateAdminBooking,
  deleteAdminBooking
} = require('../controllers/adminBookingController')
const { protect, authorize, authorizePermissions } = require('../middleware/auth')

const router = express.Router()

router.use(protect, authorize('admin'))

router.get('/users', authorizePermissions('users.view'), getAllUsers)
router.put('/users/:id', authorizePermissions('users.edit', 'roles.assign'), updateUser)
router.put('/users/:id/applications/:roleKey/review', authorizePermissions('roles.review'), reviewProviderApplication)
router.delete('/users/:id', authorizePermissions('users.edit'), deleteUser)
router.get('/bookings', authorizePermissions('bookings.manage'), getAdminBookings)
router.put('/bookings/:id', authorizePermissions('bookings.manage'), updateAdminBooking)
router.delete('/bookings/:id', authorizePermissions('bookings.manage'), deleteAdminBooking)

module.exports = router

