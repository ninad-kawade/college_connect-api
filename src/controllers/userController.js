const asyncHandler = require('express-async-handler');
const ImageKit = require('imagekit');

const Answer = require('../models/Answer');
const Announcement = require('../models/Announcement');
const Branch = require('../models/Branch');
const Event = require('../models/Event');
const Question = require('../models/Question');
const SavedItem = require('../models/SavedItem');
const SectionChangeRequest = require('../models/SectionChangeRequest');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('branch', 'name code totalYears');

  res.status(200).json({
    success: true,
    data: user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'bio', 'profileImage', 'emailPreferences'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (req.body.email !== undefined) {
    if (!req.body.currentPassword) {
      res.status(400);
      throw new Error('Current password is required to change email');
    }

    const currentUser = await User.findById(req.user._id).select('+password');
    const isMatch = await currentUser.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      res.status(401);
      throw new Error('Current password is incorrect');
    }

    const existingUser = await User.findOne({
      email: req.body.email.toLowerCase(),
      _id: { $ne: req.user._id },
    });
    if (existingUser) {
      res.status(400);
      throw new Error('Email is already in use');
    }

    updates.email = req.body.email.toLowerCase();
  }

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

const updateProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Profile photo is required');
  }

  try {
    console.log('Uploading to ImageKit:', req.file.originalname);
    
    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: req.file.buffer,
      fileName: `profile-${req.user._id}-${Date.now()}.${req.file.originalname.split('.').pop()}`,
      folder: '/college-connect/profiles/',
      isPrivateFile: false,
    });

    console.log('ImageKit upload success:', uploadResponse.url);

    // Save the ImageKit URL to the user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        profileImage: uploadResponse.url,
        imagekitFileId: uploadResponse.fileId,
      },
      { new: true, runValidators: true }
    ).populate('branch', 'name code totalYears');

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('ImageKit upload error:', error);
    res.status(500);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
});

const getDashboard = asyncHandler(async (req, res) => {
  const [user, questionsAsked, questionsAnswered, savedItems, recentAnnouncements, openDoubts, upcomingEvents] = await Promise.all([
    User.findById(req.user._id).populate('branch', 'name code totalYears'),
    Question.countDocuments({ askedBy: req.user._id }),
    Answer.countDocuments({ answeredBy: req.user._id }),
    SavedItem.countDocuments({ user: req.user._id }),
    Announcement.find({ isPublished: { $ne: false } }).sort({ createdAt: -1 }).limit(5),
    Question.find({
      branch: req.user.branch,
      year: req.user.currentYear,
      status: { $in: ['open', 'answered'] },
      moderationStatus: 'visible',
    })
      .sort({ lastActivityAt: -1 })
      .limit(5),
    Event.find({ visibility: 'public', isCancelled: false, startsAt: { $gte: new Date() } })
      .sort({ startsAt: 1 })
      .limit(5),
  ]);

  const recentMaterials = await StudyMaterial.find({
    branch: req.user.branch,
    year: req.user.currentYear,
    status: 'published',
  })
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
        savedItems,
      },
      recentAnnouncements,
      recentMaterials,
      openDoubts,
      upcomingEvents,
    },
  });
});

const createSectionChangeRequest = asyncHandler(async (req, res) => {
  const { requestedBranchId, requestedYear, reason = '' } = req.body;

  if (!requestedBranchId || !requestedYear) {
    res.status(400);
    throw new Error('requestedBranchId and requestedYear are required');
  }

  const [student, requestedBranch, pendingRequest] = await Promise.all([
    User.findById(req.user._id),
    Branch.findOne({ _id: requestedBranchId, isActive: true }),
    SectionChangeRequest.findOne({ student: req.user._id, status: 'pending' }),
  ]);

  if (pendingRequest) {
    res.status(400);
    throw new Error('You already have a pending branch/year change request');
  }

  if (!requestedBranch) {
    res.status(400);
    throw new Error('Requested branch is invalid or inactive');
  }

  if (Number(requestedYear) > requestedBranch.totalYears) {
    res.status(400);
    throw new Error('Requested year exceeds branch total years');
  }

  const sectionChangeRequest = await SectionChangeRequest.create({
    student: req.user._id,
    currentBranch: student.branch,
    currentYear: student.currentYear,
    requestedBranch: requestedBranch._id,
    requestedYear: Number(requestedYear),
    reason,
  });

  res.status(201).json({
    success: true,
    message: 'Branch/year change request submitted successfully',
    data: sectionChangeRequest,
  });
});

const getMySectionChangeRequests = asyncHandler(async (req, res) => {
  const requests = await SectionChangeRequest.find({ student: req.user._id })
    .populate('currentBranch requestedBranch', 'name code totalYears')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: requests,
  });
});

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  getDashboard,
  createSectionChangeRequest,
  getMySectionChangeRequests,
};
