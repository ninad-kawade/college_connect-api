const express = require('express');

const {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  toggleReaction,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.get('/messages', getMessages);
router.post('/messages', upload.single('file'), createMessage);
router.patch('/messages/:messageId', updateMessage);
router.delete('/messages/:messageId', deleteMessage);
router.patch('/messages/:messageId/reactions', toggleReaction);

module.exports = router;
