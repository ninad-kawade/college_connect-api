const express = require('express');

const {
  getOverview,
  getUsers,
  createBranch,
  getBranches,
  updateBranch,
  updateBranchStatus,
  createAcademicYear,
  getAcademicYears,
  updateAcademicYear,
  updateAcademicYearStatus,
  updateUserSection,
  promoteStudents,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect, authorize('superadmin'));

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.route('/branches').post(createBranch).get(getBranches);
router.route('/branches/:branchId').put(updateBranch);
router.route('/branches/:branchId/status').patch(updateBranchStatus);
router.route('/academic-years').post(createAcademicYear).get(getAcademicYears);
router.route('/academic-years/:academicYearId').put(updateAcademicYear);
router.route('/academic-years/:academicYearId/status').patch(updateAcademicYearStatus);
router.route('/users/:userId/section').put(updateUserSection);
router.route('/promote-students').post(promoteStudents);

module.exports = router;
