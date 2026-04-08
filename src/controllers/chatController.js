const asyncHandler = require('express-async-handler');

const Message = require('../models/Message');
const { isSameSectionAccess } = require('../utils/sectionHelper');

const getMessages = asyncHandler(async (req, res) => {
  const { branchId, year, page = 1, limit = 50 } = req.query;

  if (!branchId || !year) {
    res.status(400);
    throw new Error('branchId and year query parameters are required');
  }

  if (!isSameSectionAccess(req.user, branchId, Number(year))) {
    res.status(403);
    throw new Error('You can only access your own section chat');
  }

  const messages = await Message.find({ branch: branchId, year: Number(year) })
    .populate('sender', 'name email role')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: messages.reverse(),
  });
});

const createMessage = asyncHandler(async (req, res) => {
  const { branchId, year, content, type = 'text', fileUrl, fileName } = req.body;

  if (!branchId || !year) {
    res.status(400);
    throw new Error('branchId and year are required');
  }

  if (!content && !fileUrl) {
    res.status(400);
    throw new Error('Message content or file is required');
  }

  if (!isSameSectionAccess(req.user, branchId, Number(year))) {
    res.status(403);
    throw new Error('You can only send messages to your own section chat');
  }

  const message = await Message.create({
    branch: branchId,
    year: Number(year),
    sender: req.user._id,
    content,
    type,
    fileUrl,
    fileName,
  });

  const populatedMessage = await Message.findById(message._id).populate('sender', 'name email role');
  const io = req.app.get('io');

  if (io) {
    io.to(`${branchId}_${year}`).emit('receive_message', populatedMessage);
  }

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: populatedMessage,
  });
});

module.exports = {
  getMessages,
  createMessage,
};
