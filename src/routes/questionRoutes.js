const express = require('express');

const {
  createQuestion,
  getQuestions,
  getQuestionById,
  addAnswer,
  upvoteAnswer,
  downvoteAnswer,
  acceptAnswer,
  updateQuestionStatus,
  incrementQuestionView,
  toggleFollowQuestion,
  getRelatedQuestions,
  updateQuestionModeration,
  updateAnswerModeration,
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').post(upload.array('attachments', 5), createQuestion).get(getQuestions);
router.patch('/:questionId/status', updateQuestionStatus);
router.patch('/:questionId/view', incrementQuestionView);
router.patch('/:questionId/follow', toggleFollowQuestion);
router.get('/:questionId/related', getRelatedQuestions);
router.patch('/:questionId/moderation', authorize('superadmin'), updateQuestionModeration);
router.get('/:questionId', getQuestionById);
router.post('/:questionId/answers', upload.array('attachments', 5), addAnswer);
router.patch('/answers/:answerId/upvote', upvoteAnswer);
router.patch('/answers/:answerId/downvote', downvoteAnswer);
router.patch('/answers/:answerId/accept', acceptAnswer);
router.patch('/answers/:answerId/moderation', authorize('superadmin'), updateAnswerModeration);

module.exports = router;
