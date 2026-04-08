const asyncHandler = require('express-async-handler');

const AcademicYear = require('../models/AcademicYear');
const Announcement = require('../models/Announcement');
const Branch = require('../models/Branch');

const getPublicAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({ visibility: 'public' })
    .populate('createdBy', 'name role')
    .sort({ isPinned: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    data: announcements,
  });
});

const getPublicBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ isActive: true }).sort({ code: 1 });

  res.status(200).json({
    success: true,
    data: branches,
  });
});

const getPublicAcademicYears = asyncHandler(async (req, res) => {
  const academicYears = await AcademicYear.find({ isActive: true }).sort({ yearNumber: 1 });

  res.status(200).json({
    success: true,
    data: academicYears,
  });
});

module.exports = {
  getPublicAnnouncements,
  getPublicBranches,
  getPublicAcademicYears,
};
