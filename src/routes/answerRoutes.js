const express = require('express');

const {
  acceptAnswer,
  downvoteAnswer,
  updateAnswerModeration,
  upvoteAnswer,
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);
router.patch('/:answerId/upvote', upvoteAnswer);
router.patch('/:answerId/downvote', downvoteAnswer);
router.patch('/:answerId/accept', acceptAnswer);
router.patch('/:answerId/moderation', authorize('superadmin'), updateAnswerModeration);

module.exports = router;
