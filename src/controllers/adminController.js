const asyncHandler = require('express-async-handler');

const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
const User = require('../models/User');
const { promoteEligibleStudents } = require('../services/yearPromotionService');

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

const promoteStudents = asyncHandler(async (req, res) => {
  const result = await promoteEligibleStudents({ force: Boolean(req.body.force) });

  res.status(200).json({
    success: true,
    message: 'Student promotion completed',
    data: result,
  });
});

module.exports = {
  createBranch,
  getBranches,
  updateBranch,
  updateBranchStatus,
  createAcademicYear,
  getAcademicYears,
  updateUserSection,
  promoteStudents,
};
