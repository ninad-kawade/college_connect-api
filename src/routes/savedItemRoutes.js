const express = require('express');

const {
  createSavedItem,
  getSavedItems,
  deleteSavedItem,
} = require('../controllers/savedItemController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').post(createSavedItem).get(getSavedItems);
router.delete('/:savedItemId', deleteSavedItem);

module.exports = router;
