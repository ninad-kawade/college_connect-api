const express = require('express');

const {
  getPublicAnnouncements,
  getPublicBranches,
  getPublicAcademicYears,
} = require('../controllers/publicController');

const router = express.Router();

router.get('/announcements', getPublicAnnouncements);
router.get('/branches', getPublicBranches);
router.get('/academic-years', getPublicAcademicYears);

module.exports = router;
