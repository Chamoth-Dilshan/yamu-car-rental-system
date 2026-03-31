const express = require('express');
const {
  getProfile,
  updateProfile,
  updateCustomerProfile,
  updateDriverProfile,
  updateStaffProfile,
  updateAdminProfile,
  applyForProviderRole,
  withdrawProviderApplication
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, (req, res, next) => { req.uploadDir = 'profiles'; next(); }, upload.single('profilePic'), updateProfile);
router.put('/customer-profile', protect, updateCustomerProfile);
router.put('/driver-profile', protect, updateDriverProfile);
router.put('/staff-profile', protect, updateStaffProfile);
router.put('/admin-profile', protect, updateAdminProfile);
router.post('/applications/:roleKey', protect, applyForProviderRole);
router.put('/applications/:roleKey/withdraw', protect, withdrawProviderApplication);

module.exports = router;

