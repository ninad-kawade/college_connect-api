const asyncHandler = require('express-async-handler');

const AiStudyRequest = require('../models/AiStudyRequest');
const Question = require('../models/Question');
const StudyMaterial = require('../models/StudyMaterial');
const { isSameSectionAccess } = require('../utils/sectionHelper');

const createPlaceholderResult = (type, source) => {
  if (type === 'doubt_explanation') {
    return `AI-generated explanation placeholder for: ${source.title}. Connect an AI provider in aiStudyService.js to generate the final explanation.`;
  }

  return `AI-generated PDF summary placeholder for: ${source.title}. Connect an AI provider in aiStudyService.js to generate the final summary.`;
};

const explainDoubt = asyncHandler(async (req, res) => {
  const { regenerate = false } = req.body;
  const question = await Question.findById(req.params.questionId);

  if (!question || question.moderationStatus !== 'visible') {
    res.status(404);
    throw new Error('Question not found');
  }

  if (!isSameSectionAccess(req.user, question.branch, question.year)) {
    res.status(403);
    throw new Error('You can only request AI help for doubts in your own section');
  }

  if (!regenerate) {
    const existing = await AiStudyRequest.findOne({
      user: req.user._id,
      type: 'doubt_explanation',
      sourceType: 'question',
      sourceId: question._id,
      status: 'completed',
    }).sort({ createdAt: -1 });

    if (existing) {
      return res.status(200).json({ success: true, data: existing });
    }
  }

  const aiRequest = await AiStudyRequest.create({
    user: req.user._id,
    type: 'doubt_explanation',
    sourceType: 'question',
    sourceId: question._id,
    prompt: question.description,
    result: createPlaceholderResult('doubt_explanation', question),
    status: 'completed',
  });

  return res.status(201).json({
    success: true,
    message: 'AI explanation generated successfully',
    data: aiRequest,
  });
});

const summarizeMaterial = asyncHandler(async (req, res) => {
  const { regenerate = false } = req.body;
  const material = await StudyMaterial.findById(req.params.materialId);

  if (!material || material.status !== 'published') {
    res.status(404);
    throw new Error('Study material not found');
  }

  if (!isSameSectionAccess(req.user, material.branch, material.year)) {
    res.status(403);
    throw new Error('You can only summarize materials from your own section');
  }

  if (material.fileType && !material.fileType.includes('pdf')) {
    res.status(400);
    throw new Error('AI material summaries are available only for PDFs');
  }

  if (!regenerate) {
    const existing = await AiStudyRequest.findOne({
      user: req.user._id,
      type: 'material_summary',
      sourceType: 'material',
      sourceId: material._id,
      status: 'completed',
    }).sort({ createdAt: -1 });

    if (existing) {
      return res.status(200).json({ success: true, data: existing });
    }
  }

  const aiRequest = await AiStudyRequest.create({
    user: req.user._id,
    type: 'material_summary',
    sourceType: 'material',
    sourceId: material._id,
    prompt: material.title,
    result: createPlaceholderResult('material_summary', material),
    status: 'completed',
  });

  return res.status(201).json({
    success: true,
    message: 'AI summary generated successfully',
    data: aiRequest,
  });
});

const getAiRequest = asyncHandler(async (req, res) => {
  const aiRequest = await AiStudyRequest.findOne({
    _id: req.params.requestId,
    user: req.user._id,
  });

  if (!aiRequest) {
    res.status(404);
    throw new Error('AI request not found');
  }

  res.status(200).json({
    success: true,
    data: aiRequest,
  });
});

module.exports = {
  explainDoubt,
  summarizeMaterial,
  getAiRequest,
};
