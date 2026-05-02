const express = require('express');

const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getEvents);
router.post('/', protect, authorize('superadmin'), createEvent);
router.put('/:eventId', protect, authorize('superadmin'), updateEvent);
router.delete('/:eventId', protect, authorize('superadmin'), deleteEvent);

module.exports = router;
