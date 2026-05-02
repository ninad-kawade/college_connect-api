const express = require('express');

const {
  explainDoubt,
  summarizeMaterial,
  getAiRequest,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.post('/doubts/:questionId/explain', explainDoubt);
router.post('/materials/:materialId/summarize', summarizeMaterial);
router.get('/requests/:requestId', getAiRequest);

module.exports = router;
