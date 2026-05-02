const asyncHandler = require('express-async-handler');

const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const { isSameSectionAccess } = require('../utils/sectionHelper');
const { buildStoredFile, isPdfOrImage } = require('../utils/fileValidation');

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

  if (!isPdfOrImage(req.file)) {
    res.status(400);
    throw new Error('Study material uploads allow only PDF and image files');
  }

  const storedFile = buildStoredFile(req.file);

  const material = await StudyMaterial.create({
    title,
    subject,
    description,
    branch: branchId,
    year: Number(year),
    semester: semester ? Number(semester) : undefined,
    fileUrl: storedFile.fileUrl,
    fileName: storedFile.fileName,
    fileType: storedFile.fileType,
    fileSize: storedFile.fileSize,
    tags: req.body.tags ? String(req.body.tags).split(',').map((tag) => tag.trim()).filter(Boolean) : [],
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
  const { branchId, year, subject, semester, type, q, status } = req.query;
  const query = {};

  if (req.user.role !== 'superadmin') {
    query.branch = req.user.branch;
    query.year = req.user.currentYear;
  } else {
    if (branchId) query.branch = branchId;
    if (year) query.year = Number(year);
  }

  if (req.user.role !== 'superadmin') {
    query.status = 'published';
  } else if (status) {
    query.status = status;
  }

  if (subject) {
    query.subject = { $regex: subject, $options: 'i' };
  }
  if (semester) query.semester = Number(semester);
  if (type) query.fileType = { $regex: type, $options: 'i' };
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { subject: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ];
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

  if (req.user.role !== 'superadmin' && material.status !== 'published') {
    res.status(404);
    throw new Error('Study material not found');
  }

  res.status(200).json({
    success: true,
    data: material,
  });
});

const updateMaterial = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findById(req.params.materialId);
  if (!material) {
    res.status(404);
    throw new Error('Study material not found');
  }

  if (material.uploadedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only edit your own uploaded materials');
  }

  const allowedFields = ['title', 'subject', 'description', 'semester'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      material[field] = field === 'semester' ? Number(req.body[field]) : req.body[field];
    }
  });

  if (req.body.tags !== undefined) {
    material.tags = String(req.body.tags).split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  await material.save();

  const populatedMaterial = await StudyMaterial.findById(material._id)
    .populate('uploadedBy', 'name email')
    .populate('branch', 'name code');

  res.status(200).json({
    success: true,
    message: 'Study material updated successfully',
    data: populatedMaterial,
  });
});

const incrementDownload = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findById(req.params.materialId).populate('branch', 'name code');
  if (!material) {
    res.status(404);
    throw new Error('Study material not found');
  }

  if (
    req.user.role !== 'superadmin' &&
    !isSameSectionAccess(req.user, material.branch._id.toString(), material.year)
  ) {
    res.status(403);
    throw new Error('You can only download materials from your own section');
  }

  if (req.user.role !== 'superadmin' && material.status !== 'published') {
    res.status(404);
    throw new Error('Study material not found');
  }

  material.downloadCount += 1;
  await material.save();

  res.status(200).json({
    success: true,
    message: 'Download count updated successfully',
    data: material,
  });
});

const updateMaterialStatus = asyncHandler(async (req, res) => {
  const { status, reason = '' } = req.body;

  if (!['published', 'hidden', 'removed'].includes(status)) {
    res.status(400);
    throw new Error('Status must be published, hidden, or removed');
  }

  const material = await StudyMaterial.findById(req.params.materialId);
  if (!material) {
    res.status(404);
    throw new Error('Study material not found');
  }

  material.status = status;
  material.hiddenBy = status === 'published' ? null : req.user._id;
  material.hiddenReason = status === 'published' ? '' : reason;
  await material.save();

  res.status(200).json({
    success: true,
    message: 'Study material status updated successfully',
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

  material.status = 'removed';
  material.hiddenBy = req.user._id;
  material.hiddenReason = req.user.role === 'superadmin' ? 'Removed by admin' : 'Removed by uploader';
  await material.save();

  res.status(200).json({
    success: true,
    message: 'Study material deleted successfully',
  });
});

module.exports = {
  createMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  incrementDownload,
  updateMaterialStatus,
  deleteMaterial,
};
