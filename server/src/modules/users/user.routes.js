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
  getMyProviderDocument,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('./user.controller');
const { protect, authorizePermissions } = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');

const router = express.Router();
const { privateDocumentUpload } = upload;

const driverDocumentFields = [
  { name: 'nicDocument', maxCount: 1 },
  { name: 'drivingLicenseDocument', maxCount: 1 },
  { name: 'proofOfAddressDocument', maxCount: 1 }
];
const staffDocumentFields = [
  { name: 'businessRegistrationDocument', maxCount: 1 },
  { name: 'proofOfAddressDocument', maxCount: 1 }
];
const providerDocumentFields = [...driverDocumentFields, ...staffDocumentFields]
  .filter((field, index, fields) => fields.findIndex((item) => item.name === field.name) === index);
const setProviderUploadDir = (roleKey) => (req, res, next) => {
  const resolvedRoleKey = typeof roleKey === 'function' ? roleKey(req) : roleKey;
  req.uploadDir = `provider-documents/${resolvedRoleKey}/${req.user._id}`;
  next();
};

router.get('/profile', protect, authorizePermissions('profile.manage'), getProfile);
router.get('/role-history', protect, authorizePermissions('profile.manage'), getMyRoleHistory);
router.put('/profile', protect, authorizePermissions('profile.manage'), (req, res, next) => { req.uploadDir = 'profiles'; next(); }, upload.single('profilePic'), updateProfile);
router.put('/driver-profile', protect, authorizePermissions('profile.manage'), setProviderUploadDir('driver'), privateDocumentUpload.fields(driverDocumentFields), updateDriverProfile);
router.put('/staff-profile', protect, authorizePermissions('profile.manage'), setProviderUploadDir('staff'), privateDocumentUpload.fields(staffDocumentFields), updateStaffProfile);
router.put('/admin-profile', protect, authorizePermissions('profile.manage'), updateAdminProfile);
router.post('/applications/:roleKey', protect, authorizePermissions('profile.manage'), setProviderUploadDir((req) => req.params.roleKey), privateDocumentUpload.fields(providerDocumentFields), applyForProviderRole);
router.put('/applications/:roleKey/withdraw', protect, authorizePermissions('profile.manage'), withdrawProviderApplication);
router.get('/documents/:roleKey/:documentKey', protect, authorizePermissions('profile.manage'), getMyProviderDocument);
router.get('/notifications', protect, authorizePermissions('profile.manage'), getNotifications);
router.put('/notifications/read-all', protect, authorizePermissions('profile.manage'), markAllNotificationsRead);
router.put('/notifications/:notificationId/read', protect, authorizePermissions('profile.manage'), markNotificationRead);

module.exports = router;

