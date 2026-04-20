const express = require('express');

const {
  acceptAnswer,
  upvoteAnswer,
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.patch('/:answerId/upvote', upvoteAnswer);
router.patch('/:answerId/accept', acceptAnswer);

module.exports = router;
