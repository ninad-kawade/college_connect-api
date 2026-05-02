const asyncHandler = require('express-async-handler');

const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
const Announcement = require('../models/Announcement');
const Answer = require('../models/Answer');
const Message = require('../models/Message');
const ModerationAction = require('../models/ModerationAction');
const Question = require('../models/Question');
const SectionChangeRequest = require('../models/SectionChangeRequest');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const { promoteEligibleStudents } = require('../services/yearPromotionService');

const getOverview = asyncHandler(async (req, res) => {
  const [
    students,
    branches,
    academicYears,
    announcements,
    materials,
    questions,
    messages,
    latestSignups,
    recentAnnouncements,
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['student', 'alumni'] } }),
    Branch.countDocuments({ isActive: true }),
    AcademicYear.countDocuments({ isActive: true }),
    Announcement.countDocuments(),
    StudyMaterial.countDocuments(),
    Question.countDocuments(),
    Message.countDocuments(),
    User.find({ role: { $in: ['student', 'alumni'] } })
      .populate('branch', 'name code totalYears')
      .sort({ createdAt: -1 })
      .limit(6),
    Announcement.find()
      .populate('createdBy', 'name role')
      .populate('branch', 'name code')
      .sort({ createdAt: -1 })
      .limit(6),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totals: {
        students,
        branches,
        academicYears,
        announcements,
      },
      latestSignups,
      recentAnnouncements,
      activity: {
        materials,
        questions,
        messages,
      },
    },
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const { search, branchId, year, role, status } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (branchId) query.branch = branchId;
  if (year) query.currentYear = Number(year);
  if (role) query.role = role;
  if (status) query.status = status;

  const users = await User.find(query)
    .populate('branch', 'name code totalYears')
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    data: users,
  });
});

const createBranch = asyncHandler(async (req, res) => {
  const { name, code, totalYears } = req.body;

  if (!name || !code || !totalYears) {
    res.status(400);
    throw new Error('Name, code, and totalYears are required');
  }

  const branch = await Branch.create({
    name,
    code: code.toUpperCase(),
    totalYears: Number(totalYears),
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Branch created successfully',
    data: branch,
  });
});

const getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: branches,
  });
});

const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.branchId);
  if (!branch) {
    res.status(404);
    throw new Error('Branch not found');
  }

  const { name, code, totalYears } = req.body;

  if (name !== undefined) {
    branch.name = name;
  }
  if (code !== undefined) {
    branch.code = code.toUpperCase();
  }
  if (totalYears !== undefined) {
    branch.totalYears = Number(totalYears);
  }

  await branch.save();

  res.status(200).json({
    success: true,
    message: 'Branch updated successfully',
    data: branch,
  });
});

const updateBranchStatus = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.branchId);
  if (!branch) {
    res.status(404);
    throw new Error('Branch not found');
  }

  branch.isActive = Boolean(req.body.isActive);
  await branch.save();

  res.status(200).json({
    success: true,
    message: 'Branch status updated successfully',
    data: branch,
  });
});

const createAcademicYear = asyncHandler(async (req, res) => {
  const { yearNumber, label } = req.body;

  if (!yearNumber || !label) {
    res.status(400);
    throw new Error('yearNumber and label are required');
  }

  const academicYear = await AcademicYear.create({
    yearNumber: Number(yearNumber),
    label,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Academic year created successfully',
    data: academicYear,
  });
});

const getAcademicYears = asyncHandler(async (req, res) => {
  const academicYears = await AcademicYear.find().sort({ yearNumber: 1 });

  res.status(200).json({
    success: true,
    data: academicYears,
  });
});

const updateAcademicYear = asyncHandler(async (req, res) => {
  const academicYear = await AcademicYear.findById(req.params.academicYearId);
  if (!academicYear) {
    res.status(404);
    throw new Error('Academic year not found');
  }

  const { yearNumber, label } = req.body;
  if (yearNumber !== undefined) academicYear.yearNumber = Number(yearNumber);
  if (label !== undefined) academicYear.label = label;

  await academicYear.save();

  res.status(200).json({
    success: true,
    message: 'Academic year updated successfully',
    data: academicYear,
  });
});

const updateAcademicYearStatus = asyncHandler(async (req, res) => {
  const academicYear = await AcademicYear.findById(req.params.academicYearId);
  if (!academicYear) {
    res.status(404);
    throw new Error('Academic year not found');
  }

  academicYear.isActive = Boolean(req.body.isActive);
  await academicYear.save();

  res.status(200).json({
    success: true,
    message: 'Academic year status updated successfully',
    data: academicYear,
  });
});

const updateUserSection = asyncHandler(async (req, res) => {
  const { branchId, currentYear } = req.body;

  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const branch = await Branch.findOne({ _id: branchId, isActive: true });
  if (!branch) {
    res.status(400);
    throw new Error('Selected branch is invalid or inactive');
  }

  if (Number(currentYear) > branch.totalYears) {
    res.status(400);
    throw new Error('Selected year exceeds branch total years');
  }

  user.branch = branch._id;
  user.currentYear = Number(currentYear);
  user.totalYears = branch.totalYears;
  user.role = 'student';
  user.status = 'active';
  user.yearUpdatedAt = new Date();
  await user.save();

  const populatedUser = await User.findById(user._id).populate('branch', 'name code totalYears');

  res.status(200).json({
    success: true,
    message: 'User branch and year updated successfully',
    data: populatedUser,
  });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    res.status(400);
    throw new Error('Status must be active or inactive');
  }

  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'superadmin') {
    res.status(400);
    throw new Error('Super admin status cannot be changed here');
  }

  user.status = status;
  await user.save();

  const populatedUser = await User.findById(user._id).populate('branch', 'name code totalYears');

  res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    data: populatedUser,
  });
});

const getSectionChangeRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = {};
  if (status) query.status = status;

  const requests = await SectionChangeRequest.find(query)
    .populate('student', 'name email status')
    .populate('currentBranch requestedBranch', 'name code totalYears')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: requests,
  });
});

const reviewSectionChangeRequest = asyncHandler(async (req, res) => {
  const { status, adminNote = '' } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Status must be approved or rejected');
  }

  const request = await SectionChangeRequest.findById(req.params.requestId).populate('requestedBranch');
  if (!request) {
    res.status(404);
    throw new Error('Section change request not found');
  }

  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending requests can be reviewed');
  }

  request.status = status;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.adminNote = adminNote;
  await request.save();

  if (status === 'approved') {
    await User.findByIdAndUpdate(request.student, {
      branch: request.requestedBranch._id,
      currentYear: request.requestedYear,
      totalYears: request.requestedBranch.totalYears,
      yearUpdatedAt: new Date(),
    });
  }

  res.status(200).json({
    success: true,
    message: `Section change request ${status}`,
    data: request,
  });
});

const getModerationActions = asyncHandler(async (req, res) => {
  const { entityType } = req.query;
  const query = {};
  if (entityType) query.entityType = entityType;

  const actions = await ModerationAction.find(query)
    .populate('actionBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    data: actions,
  });
});

const createModerationAction = asyncHandler(async (req, res) => {
  const { entityType, entityId, action, reason = '' } = req.body;

  const actionResult = await applyModerationAction({
    adminId: req.user._id,
    entityType,
    entityId,
    action,
    reason,
  });

  res.status(201).json({
    success: true,
    message: 'Moderation action applied successfully',
    data: actionResult,
  });
});

const updateModerationEntity = asyncHandler(async (req, res) => {
  const { action, reason = '' } = req.body;

  const actionResult = await applyModerationAction({
    adminId: req.user._id,
    entityType: req.params.entityType,
    entityId: req.params.entityId,
    action,
    reason,
  });

  res.status(200).json({
    success: true,
    message: 'Moderation action applied successfully',
    data: actionResult,
  });
});

const applyModerationAction = async ({ adminId, entityType, entityId, action, reason }) => {
  if (!entityType || !entityId || !action) {
    const error = new Error('entityType, entityId, and action are required');
    error.statusCode = 400;
    throw error;
  }

  let target;
  let previousStatus = '';
  let newStatus = '';

  if (entityType === 'message') {
    target = await Message.findById(entityId);
    if (!target) throw new Error('Message not found');
    previousStatus = target.isDeleted ? 'deleted' : 'visible';
    if (action === 'restore') {
      target.isDeleted = false;
      target.deletedForEveryone = false;
      target.deletedBy = null;
      target.deletedAt = null;
      newStatus = 'visible';
    } else {
      target.content = 'This message was removed by admin';
      target.isDeleted = true;
      target.deletedForEveryone = true;
      target.deletedBy = adminId;
      target.deletedAt = new Date();
      newStatus = 'deleted';
    }
    await target.save();
  } else if (entityType === 'material') {
    target = await StudyMaterial.findById(entityId);
    if (!target) throw new Error('Study material not found');
    previousStatus = target.status;
    target.status = action === 'restore' ? 'published' : action === 'remove' ? 'removed' : 'hidden';
    target.hiddenBy = action === 'restore' ? null : adminId;
    target.hiddenReason = action === 'restore' ? '' : reason;
    newStatus = target.status;
    await target.save();
  } else if (entityType === 'question') {
    target = await Question.findById(entityId);
    if (!target) throw new Error('Question not found');
    previousStatus = target.moderationStatus;
    target.moderationStatus = action === 'restore' ? 'visible' : action === 'remove' ? 'removed' : 'hidden';
    target.moderatedBy = adminId;
    target.moderatedAt = new Date();
    newStatus = target.moderationStatus;
    await target.save();
  } else if (entityType === 'answer') {
    target = await Answer.findById(entityId);
    if (!target) throw new Error('Answer not found');
    previousStatus = target.moderationStatus;
    target.moderationStatus = action === 'restore' ? 'visible' : action === 'remove' ? 'removed' : 'hidden';
    target.moderatedBy = adminId;
    target.moderatedAt = new Date();
    newStatus = target.moderationStatus;
    await target.save();
  } else if (entityType === 'user') {
    target = await User.findById(entityId);
    if (!target) throw new Error('User not found');
    previousStatus = target.status;
    if (action === 'deactivate_user') target.status = 'inactive';
    if (action === 'activate_user') target.status = 'active';
    if (action === 'warn_user') target.adminWarningCount += 1;
    newStatus = target.status;
    await target.save();
  } else {
    const error = new Error('Invalid moderation entity type');
    error.statusCode = 400;
    throw error;
  }

  const moderationAction = await ModerationAction.create({
    actionBy: adminId,
    entityType,
    entityId,
    reason,
    action,
    previousStatus,
    newStatus,
  });

  return {
    action: moderationAction,
    target,
  };
};

const promoteStudents = asyncHandler(async (req, res) => {
  const result = await promoteEligibleStudents({ force: Boolean(req.body.force) });

  res.status(200).json({
    success: true,
    message: 'Student promotion completed',
    data: result,
  });
});

module.exports = {
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
  updateUserStatus,
  getSectionChangeRequests,
  reviewSectionChangeRequest,
  getModerationActions,
  createModerationAction,
  updateModerationEntity,
  promoteStudents,
};
