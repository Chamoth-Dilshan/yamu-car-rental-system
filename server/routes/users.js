const express = require('express');
const {
  getProfile,
  getMyRoleHistory,
  updateProfile,
  updateDriverProfile,
  updateStaffProfile,
  updateAdminProfile,
  applyForProviderRole,
  withdrawProviderApplication,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/userController');
const { protect, authorizePermissions } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/profile', protect, authorizePermissions('profile.manage'), getProfile);
router.get('/role-history', protect, authorizePermissions('profile.manage'), getMyRoleHistory);
router.put('/profile', protect, authorizePermissions('profile.manage'), (req, res, next) => { req.uploadDir = 'profiles'; next(); }, upload.single('profilePic'), updateProfile);
router.put('/driver-profile', protect, authorizePermissions('profile.manage'), updateDriverProfile);
router.put('/staff-profile', protect, authorizePermissions('profile.manage'), updateStaffProfile);
router.put('/admin-profile', protect, authorizePermissions('profile.manage'), updateAdminProfile);
router.post('/applications/:roleKey', protect, authorizePermissions('profile.manage'), applyForProviderRole);
router.put('/applications/:roleKey/withdraw', protect, authorizePermissions('profile.manage'), withdrawProviderApplication);
router.get('/notifications', protect, authorizePermissions('profile.manage'), getNotifications);
router.put('/notifications/read-all', protect, authorizePermissions('profile.manage'), markAllNotificationsRead);
router.put('/notifications/:notificationId/read', protect, authorizePermissions('profile.manage'), markNotificationRead);

module.exports = router;

