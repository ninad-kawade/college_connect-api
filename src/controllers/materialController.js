const asyncHandler = require('express-async-handler');

const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const { isSameSectionAccess } = require('../utils/sectionHelper');

const createMaterial = asyncHandler(async (req, res) => {
  const { title, subject, description, branchId, year, semester } = req.body;

  if (!title || !subject || !branchId || !year || !req.file) {
    res.status(400);
    throw new Error('title, subject, branchId, year, and file are required');
  }

  if (!isSameSectionAccess(req.user, branchId, Number(year))) {
    res.status(403);
    throw new Error('You can only upload materials for your own section');
  }

  const material = await StudyMaterial.create({
    title,
    subject,
    description,
    branch: branchId,
    year: Number(year),
    semester: semester ? Number(semester) : undefined,
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    uploadedBy: req.user._id,
  });

  await User.findByIdAndUpdate(req.user._id, {
    $inc: { notesSharedCount: 1, reputationPoints: 10 },
  });

  const populatedMaterial = await StudyMaterial.findById(material._id)
    .populate('uploadedBy', 'name email')
    .populate('branch', 'name code');

  res.status(201).json({
    success: true,
    message: 'Study material uploaded successfully',
    data: populatedMaterial,
  });
});

const getMaterials = asyncHandler(async (req, res) => {
  const { branchId, year, subject } = req.query;
  const query = {};

  if (req.user.role !== 'superadmin') {
    query.branch = req.user.branch;
    query.year = req.user.currentYear;
  } else {
    if (branchId) query.branch = branchId;
    if (year) query.year = Number(year);
  }

  if (subject) {
    query.subject = { $regex: subject, $options: 'i' };
  }

  const materials = await StudyMaterial.find(query)
    .populate('uploadedBy', 'name email')
    .populate('branch', 'name code')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: materials,
  });
});

const getMaterialById = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findById(req.params.materialId)
    .populate('uploadedBy', 'name email')
    .populate('branch', 'name code');

  if (!material) {
    res.status(404);
    throw new Error('Study material not found');
  }

  if (
    req.user.role !== 'superadmin' &&
    !isSameSectionAccess(req.user, material.branch._id.toString(), material.year)
  ) {
    res.status(403);
    throw new Error('You can only access materials from your own section');
  }

  res.status(200).json({
    success: true,
    data: material,
  });
});

const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findById(req.params.materialId);
  if (!material) {
    res.status(404);
    throw new Error('Study material not found');
  }

  if (
    req.user.role !== 'superadmin' &&
    material.uploadedBy.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('You can only delete your own uploaded materials');
  }

  await material.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Study material deleted successfully',
  });
});

module.exports = {
  createMaterial,
  getMaterials,
  getMaterialById,
  deleteMaterial,
};
