const express = require('express');

const {
  createBranch,
  getBranches,
  updateBranch,
  updateBranchStatus,
  createAcademicYear,
  getAcademicYears,
  updateUserSection,
  promoteStudents,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect, authorize('superadmin'));

router.route('/branches').post(createBranch).get(getBranches);
router.route('/branches/:branchId').put(updateBranch);
router.route('/branches/:branchId/status').patch(updateBranchStatus);
router.route('/academic-years').post(createAcademicYear).get(getAcademicYears);
router.route('/users/:userId/section').put(updateUserSection);
router.route('/promote-students').post(promoteStudents);

module.exports = router;
