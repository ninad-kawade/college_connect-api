const express = require('express');

const {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  getDashboard,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/photo', upload.single('photo'), updateProfilePhoto);
router.get('/dashboard', getDashboard);

module.exports = router;
