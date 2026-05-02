const express = require('express');
const { register, login, googleLogin, getMe, switchRole } = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.put('/switch-role', protect, switchRole);

module.exports = router;

