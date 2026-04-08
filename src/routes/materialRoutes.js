const express = require('express');

const {
  createMaterial,
  getMaterials,
  getMaterialById,
  deleteMaterial,
} = require('../controllers/materialController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').post(upload.single('file'), createMaterial).get(getMaterials);
router.route('/:materialId').get(getMaterialById).delete(deleteMaterial);

module.exports = router;
