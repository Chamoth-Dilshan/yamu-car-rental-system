const express = require('express');
const { getAllUsers, updateUser, reviewProviderApplication, deleteUser } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.put('/users/:id/applications/:roleKey/review', reviewProviderApplication);
router.delete('/users/:id', deleteUser);

module.exports = router;

