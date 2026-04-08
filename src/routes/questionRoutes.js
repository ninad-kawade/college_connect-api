const express = require('express');

const {
  createQuestion,
  getQuestions,
  getQuestionById,
  addAnswer,
  upvoteAnswer,
  acceptAnswer,
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').post(createQuestion).get(getQuestions);
router.get('/:questionId', getQuestionById);
router.post('/:questionId/answers', addAnswer);
router.patch('/answers/:answerId/upvote', upvoteAnswer);
router.patch('/answers/:answerId/accept', acceptAnswer);

module.exports = router;
