const express = require('express');

const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', getAnnouncements);
router.post('/', authorize('superadmin'), createAnnouncement);
router.put('/:announcementId', authorize('superadmin'), updateAnnouncement);
router.delete('/:announcementId', authorize('superadmin'), deleteAnnouncement);

module.exports = router;
