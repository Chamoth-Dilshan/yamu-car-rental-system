const express = require('express');
const { getAllUsers, getUserRoleHistory, getUserProviderDocument, updateUser, reviewProviderApplication, deactivateUser, restoreUser } = require('./admin.controller')
const {
  getAdminBookings,
  updateAdminBooking,
  deleteAdminBooking
} = require('./adminBooking.controller')
const { protect, authorize, authorizePermissions } = require('../../middleware/auth.middleware')

const router = express.Router()

router.use(protect, authorize('admin'))

router.get('/users', authorizePermissions('users.view'), getAllUsers)
router.get('/users/:id/role-history', authorizePermissions('users.view'), getUserRoleHistory)
router.get('/users/:id/documents/:roleKey/:documentKey', authorizePermissions('roles.review'), getUserProviderDocument)
router.put('/users/:id', authorizePermissions('users.edit', 'roles.assign'), updateUser)
router.put('/users/:id/applications/:roleKey/review', authorizePermissions('roles.review'), reviewProviderApplication)
router.delete('/users/:id', authorizePermissions('users.edit'), deactivateUser)
router.put('/users/:id/restore', authorizePermissions('users.edit'), restoreUser)
router.get('/bookings', authorizePermissions('bookings.manage'), getAdminBookings)
router.put('/bookings/:id', authorizePermissions('bookings.manage'), updateAdminBooking)
router.delete('/bookings/:id', authorizePermissions('bookings.manage'), deleteAdminBooking)

module.exports = router

