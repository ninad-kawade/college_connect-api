const express = require('express');

const {
  createMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  incrementDownload,
  updateMaterialStatus,
  deleteMaterial,
} = require('../controllers/materialController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').post(upload.single('file'), createMaterial).get(getMaterials);
router.patch('/:materialId/download', incrementDownload);
router.patch('/:materialId/status', authorize('superadmin'), updateMaterialStatus);
router.route('/:materialId').get(getMaterialById).put(updateMaterial).delete(deleteMaterial);

module.exports = router;
