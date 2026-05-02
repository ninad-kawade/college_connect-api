const asyncHandler = require('express-async-handler');

const Announcement = require('../models/Announcement');

const getAnnouncements = asyncHandler(async (req, res) => {
  // V2: All announcements are public-only
  const announcements = await Announcement.find({})
    .populate('createdBy', 'name role')
    .sort({ isPinned: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    data: announcements,
  });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, isPinned = false } = req.body;

  if (!title || !content) {
    res.status(400);
    throw new Error('Title and content are required');
  }

  // V2: All announcements are public-only (no visibility, branch, year fields)
  const announcement = await Announcement.create({
    title,
    content,
    createdBy: req.user._id,
    isPinned: Boolean(isPinned),
  });

  const populatedAnnouncement = await Announcement.findById(announcement._id)
    .populate('createdBy', 'name role');

  res.status(201).json({
    success: true,
    message: 'Announcement created successfully',
    data: populatedAnnouncement,
  });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.announcementId);
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }

  const { title, content, isPinned } = req.body;

  if (title !== undefined) announcement.title = title;
  if (content !== undefined) announcement.content = content;
  if (isPinned !== undefined) announcement.isPinned = Boolean(isPinned);

  await announcement.save();

  const populatedAnnouncement = await Announcement.findById(announcement._id)
    .populate('createdBy', 'name role');

  res.status(200).json({
    success: true,
    message: 'Announcement updated successfully',
    data: populatedAnnouncement,
  });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.announcementId);
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }

  await announcement.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Announcement deleted successfully',
  });
});

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
