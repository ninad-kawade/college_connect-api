const asyncHandler = require('express-async-handler');

const Answer = require('../models/Answer');
const Question = require('../models/Question');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('branch', 'name code totalYears');

  res.status(200).json({
    success: true,
    data: user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'bio', 'profileImage'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).populate('branch', 'name code totalYears');

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const [user, questionsAsked, questionsAnswered] = await Promise.all([
    User.findById(req.user._id).populate('branch', 'name code totalYears'),
    Question.countDocuments({ askedBy: req.user._id }),
    Answer.countDocuments({ answeredBy: req.user._id }),
  ]);

  const recentMaterials = await StudyMaterial.find({ uploadedBy: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title subject year fileUrl createdAt');

  res.status(200).json({
    success: true,
    data: {
      profile: user,
      stats: {
        notesShared: user.notesSharedCount,
        questionsAsked,
        questionsAnswered,
        reputationPoints: user.reputationPoints,
        doubtsSolved: user.doubtsSolvedCount,
        upvotesReceived: user.upvotesReceivedCount,
      },
      recentMaterials,
    },
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
};
