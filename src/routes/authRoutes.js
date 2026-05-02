const express = require('express');

const {
  signup,
  login,
  adminLogin,
  getMe,
  logout,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/forgot-password/otp', requestPasswordResetOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
