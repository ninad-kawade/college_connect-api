const express = require('express');

const {
  getPublicAnnouncements,
  getPublicBranches,
  getPublicAcademicYears,
  getHomepageStats,
} = require('../controllers/publicController');

const router = express.Router();

router.get('/announcements', getPublicAnnouncements);
router.get('/branches', getPublicBranches);
router.get('/academic-years', getPublicAcademicYears);
router.get('/homepage-stats', getHomepageStats);

module.exports = router;
