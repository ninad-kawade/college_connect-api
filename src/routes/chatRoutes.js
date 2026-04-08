const express = require('express');

const { getMessages, createMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/messages', getMessages);
router.post('/messages', createMessage);

module.exports = router;
