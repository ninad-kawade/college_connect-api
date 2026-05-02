const asyncHandler = require('express-async-handler');

const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { isSameSectionAccess } = require('../utils/sectionHelper');
const { buildStoredFile, isPdfOrImage } = require('../utils/fileValidation');

const buildAttachments = (files = []) => files.map(buildStoredFile).filter(Boolean);

const hasInvalidAttachment = (files = []) => files.some((file) => !isPdfOrImage(file));

const createQuestion = asyncHandler(async (req, res) => {
  const { title, description, branchId, year, tags = [], isAnonymous = false } = req.body;

  if (!title || !description || !branchId || !year) {
    res.status(400);
    throw new Error('title, description, branchId, and year are required');
  }

  if (!isSameSectionAccess(req.user, branchId, Number(year))) {
    res.status(403);
    throw new Error('You can only ask questions in your own section');
  }

  if (hasInvalidAttachment(req.files || [])) {
    res.status(400);
    throw new Error('Doubt attachments allow only PDF and image files');
  }

  const question = await Question.create({
    title,
    description,
    branch: branchId,
    year: Number(year),
    askedBy: req.user._id,
    tags: Array.isArray(tags) ? tags : String(tags).split(',').map((tag) => tag.trim()).filter(Boolean),
    isAnonymous: Boolean(isAnonymous),
    attachments: buildAttachments(req.files || []),
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
  const { branchId, year, resolved, status, q, tags } = req.query;
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
  if (status) query.status = status;
  if (tags) query.tags = { $in: String(tags).split(',').map((tag) => tag.trim()).filter(Boolean) };
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ];
  }
  if (req.user.role !== 'superadmin') {
    query.moderationStatus = 'visible';
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

  const answerQuery = { question: question._id };
  if (req.user.role !== 'superadmin') {
    answerQuery.moderationStatus = 'visible';
  }

  const answers = await Answer.find(answerQuery)
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
  const { content, isAnonymous = false } = req.body;

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

  if (hasInvalidAttachment(req.files || [])) {
    res.status(400);
    throw new Error('Answer attachments allow only PDF and image files');
  }

  const answer = await Answer.create({
    question: question._id,
    answeredBy: req.user._id,
    content,
    isAnonymous: Boolean(isAnonymous),
    attachments: buildAttachments(req.files || []),
  });

  await Promise.all([
    Question.findByIdAndUpdate(question._id, {
      $inc: { answerCount: 1 },
      $set: { status: question.status === 'open' ? 'answered' : question.status, lastActivityAt: new Date() },
    }),
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
    answer.upvotes = Math.max(0, answer.upvotes - 1);
    answer.upvotedBy = answer.upvotedBy.filter((userId) => userId.toString() !== req.user._id.toString());
  } else {
    answer.upvotes += 1;
    answer.upvotedBy.push(req.user._id);
    answer.downvotedBy = answer.downvotedBy.filter((userId) => userId.toString() !== req.user._id.toString());
    answer.downvotes = answer.downvotedBy.length;
  }
  await answer.save();

  if (!alreadyUpvoted) {
    await User.findByIdAndUpdate(answer.answeredBy, {
      $inc: { upvotesReceivedCount: 1, reputationPoints: 2 },
    });
  }

  res.status(200).json({
    success: true,
    message: 'Answer upvoted successfully',
    data: answer,
  });
});

const acceptAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.answerId).populate({
    path: 'question',
    select: 'askedBy isResolved status acceptedAnswer',
  });

  if (!answer) {
    res.status(404);
    throw new Error('Answer not found');
  }

  if (answer.question.askedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the question owner can accept an answer');
  }

  await Answer.updateMany({ question: answer.question._id }, { $set: { isAccepted: false } });

  answer.isAccepted = true;
  await answer.save();

  answer.question.isResolved = true;
  answer.question.status = 'resolved';
  answer.question.acceptedAnswer = answer._id;
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

const downvoteAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.answerId);
  if (!answer) {
    res.status(404);
    throw new Error('Answer not found');
  }

  const alreadyDownvoted = answer.downvotedBy.some(
    (userId) => userId.toString() === req.user._id.toString()
  );

  if (alreadyDownvoted) {
    answer.downvotedBy = answer.downvotedBy.filter((userId) => userId.toString() !== req.user._id.toString());
  } else {
    answer.downvotedBy.push(req.user._id);
    answer.upvotedBy = answer.upvotedBy.filter((userId) => userId.toString() !== req.user._id.toString());
  }

  answer.downvotes = answer.downvotedBy.length;
  answer.upvotes = answer.upvotedBy.length;
  await answer.save();

  res.status(200).json({
    success: true,
    message: 'Answer downvote updated successfully',
    data: answer,
  });
});

const updateQuestionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const question = await Question.findById(req.params.questionId);

  if (!['open', 'answered', 'resolved', 'closed'].includes(status)) {
    res.status(400);
    throw new Error('Invalid question status');
  }

  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  if (question.askedBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
    res.status(403);
    throw new Error('Only the question owner or super admin can update status');
  }

  question.status = status;
  question.isResolved = status === 'resolved';
  question.lastActivityAt = new Date();
  await question.save();

  res.status(200).json({
    success: true,
    message: 'Question status updated successfully',
    data: question,
  });
});

const incrementQuestionView = asyncHandler(async (req, res) => {
  const question = await Question.findByIdAndUpdate(
    req.params.questionId,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  res.status(200).json({
    success: true,
    data: { views: question.views },
  });
});

const toggleFollowQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.questionId);
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  if (!isSameSectionAccess(req.user, question.branch, question.year)) {
    res.status(403);
    throw new Error('You can only follow doubts from your own section');
  }

  const alreadyFollowing = question.followedBy.some(
    (userId) => userId.toString() === req.user._id.toString()
  );

  if (alreadyFollowing) {
    question.followedBy = question.followedBy.filter((userId) => userId.toString() !== req.user._id.toString());
  } else {
    question.followedBy.push(req.user._id);
  }

  await question.save();

  res.status(200).json({
    success: true,
    message: alreadyFollowing ? 'Question unfollowed' : 'Question followed',
    data: question,
  });
});

const getRelatedQuestions = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.questionId);
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  if (!isSameSectionAccess(req.user, question.branch, question.year)) {
    res.status(403);
    throw new Error('You can only view related doubts from your own section');
  }

  const related = await Question.find({
    _id: { $ne: question._id },
    branch: question.branch,
    year: question.year,
    moderationStatus: 'visible',
    $or: [
      { tags: { $in: question.tags } },
      { title: { $regex: question.title.split(' ').slice(0, 3).join('|'), $options: 'i' } },
    ],
  })
    .populate('askedBy', 'name email')
    .sort({ lastActivityAt: -1 })
    .limit(8);

  res.status(200).json({
    success: true,
    data: related,
  });
});

const updateQuestionModeration = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['visible', 'hidden', 'removed'].includes(status)) {
    res.status(400);
    throw new Error('Invalid moderation status');
  }

  const question = await Question.findByIdAndUpdate(
    req.params.questionId,
    { moderationStatus: status, moderatedBy: req.user._id, moderatedAt: new Date() },
    { new: true }
  );

  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  res.status(200).json({
    success: true,
    message: 'Question moderation updated successfully',
    data: question,
  });
});

const updateAnswerModeration = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['visible', 'hidden', 'removed'].includes(status)) {
    res.status(400);
    throw new Error('Invalid moderation status');
  }

  const answer = await Answer.findByIdAndUpdate(
    req.params.answerId,
    { moderationStatus: status, moderatedBy: req.user._id, moderatedAt: new Date() },
    { new: true }
  );

  if (!answer) {
    res.status(404);
    throw new Error('Answer not found');
  }

  res.status(200).json({
    success: true,
    message: 'Answer moderation updated successfully',
    data: answer,
  });
});

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  addAnswer,
  upvoteAnswer,
  downvoteAnswer,
  acceptAnswer,
  updateQuestionStatus,
  incrementQuestionView,
  toggleFollowQuestion,
  getRelatedQuestions,
  updateQuestionModeration,
  updateAnswerModeration,
};
