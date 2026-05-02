const asyncHandler = require('express-async-handler');

const Question = require('../models/Question');
const SavedItem = require('../models/SavedItem');
const StudyMaterial = require('../models/StudyMaterial');
const { isSameSectionAccess } = require('../utils/sectionHelper');

const assertCanSave = async (user, entityType, entityId) => {
  if (entityType === 'material') {
    const material = await StudyMaterial.findById(entityId);
    if (!material || material.status !== 'published') return false;
    return isSameSectionAccess(user, material.branch, material.year);
  }

  if (entityType === 'question') {
    const question = await Question.findById(entityId);
    if (!question || question.moderationStatus !== 'visible') return false;
    return isSameSectionAccess(user, question.branch, question.year);
  }

  return false;
};

const createSavedItem = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.body;

  if (!['material', 'question'].includes(entityType) || !entityId) {
    res.status(400);
    throw new Error('entityType and entityId are required');
  }

  const canSave = await assertCanSave(req.user, entityType, entityId);
  if (!canSave) {
    res.status(403);
    throw new Error('You can only save visible items from your own section');
  }

  const savedItem = await SavedItem.findOneAndUpdate(
    { user: req.user._id, entityType, entityId },
    { user: req.user._id, entityType, entityId },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({
    success: true,
    message: 'Item saved successfully',
    data: savedItem,
  });
});

const getSavedItems = asyncHandler(async (req, res) => {
  const { entityType } = req.query;
  const query = { user: req.user._id };
  if (entityType) query.entityType = entityType;

  const savedItems = await SavedItem.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: savedItems,
  });
});

const deleteSavedItem = asyncHandler(async (req, res) => {
  const savedItem = await SavedItem.findOneAndDelete({
    _id: req.params.savedItemId,
    user: req.user._id,
  });

  if (!savedItem) {
    res.status(404);
    throw new Error('Saved item not found');
  }

  res.status(200).json({
    success: true,
    message: 'Saved item removed successfully',
  });
});

module.exports = {
  createSavedItem,
  getSavedItems,
  deleteSavedItem,
};
