const asyncHandler = require('express-async-handler');

const AcademicYear = require('../models/AcademicYear');
const Announcement = require('../models/Announcement');
const Answer = require('../models/Answer');
const Branch = require('../models/Branch');
const Question = require('../models/Question');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');

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

const getHomepageStats = asyncHandler(async (req, res) => {
  const io = req.app.get('io');

  const [students, notesShared, doubtsSolved, activeBranches, acceptedAnswers, activeStudents] = await Promise.all([
    User.countDocuments({ role: { $in: ['student', 'alumni'] } }),
    StudyMaterial.countDocuments(),
    Question.countDocuments({ isResolved: true }),
    Branch.countDocuments({ isActive: true }),
    Answer.countDocuments({ isAccepted: true }),
    User.countDocuments({ role: 'student', status: 'active' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      onlineNow: io?.engine?.clientsCount ?? 0,
      students,
      notesShared,
      doubtsSolved,
      colleges: activeBranches,
      activeStudents,
      acceptedAnswers,
    },
  });
});

module.exports = {
  getPublicAnnouncements,
  getPublicBranches,
  getPublicAcademicYears,
  getHomepageStats,
};
