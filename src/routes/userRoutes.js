const express = require('express');

const {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  getDashboard,
  createSectionChangeRequest,
  getMySectionChangeRequests,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/photo', upload.single('photo'), updateProfilePhoto);
router.get('/dashboard', getDashboard);
router.post('/section-change-requests', createSectionChangeRequest);
router.get('/section-change-requests/me', getMySectionChangeRequests);

module.exports = router;
