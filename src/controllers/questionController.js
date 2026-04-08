const asyncHandler = require('express-async-handler');

const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { isSameSectionAccess } = require('../utils/sectionHelper');

const createQuestion = asyncHandler(async (req, res) => {
  const { title, description, branchId, year, tags = [] } = req.body;

  if (!title || !description || !branchId || !year) {
    res.status(400);
    throw new Error('title, description, branchId, and year are required');
  }

  if (!isSameSectionAccess(req.user, branchId, Number(year))) {
    res.status(403);
    throw new Error('You can only ask questions in your own section');
  }

  const question = await Question.create({
    title,
    description,
    branch: branchId,
    year: Number(year),
    askedBy: req.user._id,
    tags,
  });

  const populatedQuestion = await Question.findById(question._id)
    .populate('askedBy', 'name email')
    .populate('branch', 'name code');

  res.status(201).json({
    success: true,
    message: 'Question created successfully',
    data: populatedQuestion,
  });
});

const getQuestions = asyncHandler(async (req, res) => {
  const { branchId, year, resolved } = req.query;
  const query = {};

  if (req.user.role === 'superadmin') {
    if (branchId) query.branch = branchId;
    if (year) query.year = Number(year);
  } else {
    query.branch = req.user.branch;
    query.year = req.user.currentYear;
  }

  if (resolved !== undefined) {
    query.isResolved = resolved === 'true';
  }

  const questions = await Question.find(query)
    .populate('askedBy', 'name email')
    .populate('branch', 'name code')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: questions,
  });
});

const getQuestionById = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.questionId)
    .populate('askedBy', 'name email')
    .populate('branch', 'name code');

  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  if (
    req.user.role !== 'superadmin' &&
    !isSameSectionAccess(req.user, question.branch._id.toString(), question.year)
  ) {
    res.status(403);
    throw new Error('You can only access questions from your own section');
  }

  const answers = await Answer.find({ question: question._id })
    .populate('answeredBy', 'name email')
    .sort({ isAccepted: -1, upvotes: -1, createdAt: 1 });

  res.status(200).json({
    success: true,
    data: {
      question,
      answers,
    },
  });
});

const addAnswer = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    res.status(400);
    throw new Error('Answer content is required');
  }

  const question = await Question.findById(req.params.questionId).populate('branch', 'name code');
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  if (
    req.user.role !== 'superadmin' &&
    !isSameSectionAccess(req.user, question.branch._id.toString(), question.year)
  ) {
    res.status(403);
    throw new Error('You can only answer questions from your own section');
  }

  const answer = await Answer.create({
    question: question._id,
    answeredBy: req.user._id,
    content,
  });

  await Promise.all([
    Question.findByIdAndUpdate(question._id, { $inc: { answerCount: 1 } }),
    User.findByIdAndUpdate(req.user._id, {
      $inc: { doubtsSolvedCount: 1, reputationPoints: 10 },
    }),
  ]);

  const populatedAnswer = await Answer.findById(answer._id).populate('answeredBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Answer added successfully',
    data: populatedAnswer,
  });
});

const upvoteAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.answerId);
  if (!answer) {
    res.status(404);
    throw new Error('Answer not found');
  }

  const alreadyUpvoted = answer.upvotedBy.some(
    (userId) => userId.toString() === req.user._id.toString()
  );

  if (alreadyUpvoted) {
    res.status(400);
    throw new Error('You have already upvoted this answer');
  }

  answer.upvotes += 1;
  answer.upvotedBy.push(req.user._id);
  await answer.save();

  await User.findByIdAndUpdate(answer.answeredBy, {
    $inc: { upvotesReceivedCount: 1, reputationPoints: 2 },
  });

  res.status(200).json({
    success: true,
    message: 'Answer upvoted successfully',
    data: answer,
  });
});

const acceptAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.answerId).populate({
    path: 'question',
    select: 'askedBy isResolved',
  });

  if (!answer) {
    res.status(404);
    throw new Error('Answer not found');
  }

  if (answer.question.askedBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
    res.status(403);
    throw new Error('Only the question owner or super admin can accept an answer');
  }

  await Answer.updateMany({ question: answer.question._id }, { $set: { isAccepted: false } });

  answer.isAccepted = true;
  await answer.save();

  answer.question.isResolved = true;
  await answer.question.save();

  await User.findByIdAndUpdate(answer.answeredBy, {
    $inc: { reputationPoints: 15 },
  });

  res.status(200).json({
    success: true,
    message: 'Answer accepted successfully',
    data: answer,
  });
});

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  addAnswer,
  upvoteAnswer,
  acceptAnswer,
};
