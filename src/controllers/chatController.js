const asyncHandler = require('express-async-handler');

const Message = require('../models/Message');
const { isSameSectionAccess } = require('../utils/sectionHelper');
const { buildStoredFile, isPdfOrImage } = require('../utils/fileValidation');

const populateMessage = (query) =>
  query
    .populate('sender', 'name email role')
    .populate('replyTo', 'content sender type fileName isDeleted')
    .populate('mentions', 'name email');

const getMessages = asyncHandler(async (req, res) => {
  const { branchId, year, page = 1, limit = 50, before } = req.query;

  if (!branchId || !year) {
    res.status(400);
    throw new Error('branchId and year query parameters are required');
  }

  if (!isSameSectionAccess(req.user, branchId, Number(year))) {
    res.status(403);
    throw new Error('You can only access your own section chat');
  }

  const query = { branch: branchId, year: Number(year) };
  if (before) {
    const cursor = await Message.findById(before).select('createdAt');
    if (cursor) {
      query.createdAt = { $lt: cursor.createdAt };
    }
  }

  const messages = await populateMessage(Message.find(query))
    .sort({ createdAt: -1 })
    .skip(before ? 0 : (Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: messages.reverse(),
  });
});

const createMessage = asyncHandler(async (req, res) => {
  const { branchId, year, content, type = 'text', fileUrl, fileName, replyTo, mentions = [] } = req.body;

  if (!branchId || !year) {
    res.status(400);
    throw new Error('branchId and year are required');
  }

  const uploadedFile = req.file ? buildStoredFile(req.file) : null;

  if (req.file && !isPdfOrImage(req.file)) {
    res.status(400);
    throw new Error('Chat file sharing allows only PDF and image files');
  }

  if (!content && !fileUrl && !uploadedFile) {
    res.status(400);
    throw new Error('Message content or file is required');
  }

  if (!isSameSectionAccess(req.user, branchId, Number(year))) {
    res.status(403);
    throw new Error('You can only send messages to your own section chat');
  }

  if (replyTo) {
    const parentMessage = await Message.findById(replyTo);
    if (
      !parentMessage ||
      parentMessage.branch.toString() !== branchId.toString() ||
      Number(parentMessage.year) !== Number(year)
    ) {
      res.status(400);
      throw new Error('Reply target must be a message from the same section');
    }
  }

  const mentionIds = Array.isArray(mentions) ? mentions : String(mentions || '').split(',').filter(Boolean);
  const storedFile = uploadedFile || {
    fileUrl: fileUrl || '',
    fileName: fileName || '',
    fileType: req.body.fileType || '',
    fileSize: Number(req.body.fileSize || 0),
  };

  const message = await Message.create({
    branch: branchId,
    year: Number(year),
    sender: req.user._id,
    content,
    type: storedFile.fileUrl ? 'file' : type,
    fileUrl: storedFile.fileUrl,
    fileName: storedFile.fileName,
    fileType: storedFile.fileType,
    fileSize: storedFile.fileSize,
    replyTo: replyTo || null,
    mentions: mentionIds,
  });

  const populatedMessage = await populateMessage(Message.findById(message._id));
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

const updateMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only edit your own messages');
  }

  if (message.isDeleted) {
    res.status(400);
    throw new Error('Deleted messages cannot be edited');
  }

  if (!content) {
    res.status(400);
    throw new Error('Message content is required');
  }

  message.content = content;
  message.editedAt = new Date();
  await message.save();

  const populatedMessage = await populateMessage(Message.findById(message._id));
  const io = req.app.get('io');
  if (io) {
    io.to(`${message.branch}_${message.year}`).emit('message_edited', populatedMessage);
  }

  res.status(200).json({
    success: true,
    message: 'Message updated successfully',
    data: populatedMessage,
  });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  const canDelete = req.user.role === 'superadmin' || message.sender.toString() === req.user._id.toString();
  if (!canDelete) {
    res.status(403);
    throw new Error('You can only delete your own messages');
  }

  message.content = 'This message was removed';
  message.isDeleted = true;
  message.deletedForEveryone = true;
  message.deletedBy = req.user._id;
  message.deletedAt = new Date();
  await message.save();

  const populatedMessage = await populateMessage(Message.findById(message._id));
  const io = req.app.get('io');
  if (io) {
    io.to(`${message.branch}_${message.year}`).emit('message_deleted', populatedMessage);
  }

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
    data: populatedMessage,
  });
});

const toggleReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const message = await Message.findById(req.params.messageId);

  if (!emoji) {
    res.status(400);
    throw new Error('emoji is required');
  }

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  if (!isSameSectionAccess(req.user, message.branch, message.year)) {
    res.status(403);
    throw new Error('You can only react to messages in your own section');
  }

  const reaction = message.reactions.find((item) => item.emoji === emoji);
  if (!reaction) {
    message.reactions.push({ emoji, users: [req.user._id] });
  } else {
    const userIndex = reaction.users.findIndex((userId) => userId.toString() === req.user._id.toString());
    if (userIndex >= 0) {
      reaction.users.splice(userIndex, 1);
    } else {
      reaction.users.push(req.user._id);
    }
  }

  message.reactions = message.reactions.filter((item) => item.users.length > 0);
  await message.save();

  const populatedMessage = await populateMessage(Message.findById(message._id));
  const io = req.app.get('io');
  if (io) {
    io.to(`${message.branch}_${message.year}`).emit('message_reacted', populatedMessage);
  }

  res.status(200).json({
    success: true,
    message: 'Message reaction updated successfully',
    data: populatedMessage,
  });
});

module.exports = {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  toggleReaction,
};
