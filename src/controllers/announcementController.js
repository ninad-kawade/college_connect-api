const asyncHandler = require('express-async-handler');

const Announcement = require('../models/Announcement');

const getAnnouncements = asyncHandler(async (req, res) => {
  const query =
    req.user.role === 'superadmin'
      ? {}
      : {
          $or: [
            { visibility: 'public' },
            {
              visibility: 'section',
              branch: req.user.branch,
              year: req.user.currentYear,
            },
          ],
        };

  const announcements = await Announcement.find(query)
    .populate('createdBy', 'name role')
    .populate('branch', 'name code')
    .sort({ isPinned: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    data: announcements,
  });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, visibility = 'public', branchId, year, isPinned = false } = req.body;

  if (!title || !content) {
    res.status(400);
    throw new Error('Title and content are required');
  }

  if (visibility === 'section' && (!branchId || !year)) {
    res.status(400);
    throw new Error('branchId and year are required for section announcements');
  }

  const announcement = await Announcement.create({
    title,
    content,
    visibility,
    branch: visibility === 'section' ? branchId : null,
    year: visibility === 'section' ? Number(year) : null,
    createdBy: req.user._id,
    isPinned: Boolean(isPinned),
  });

  const populatedAnnouncement = await Announcement.findById(announcement._id)
    .populate('createdBy', 'name role')
    .populate('branch', 'name code');

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

  const { title, content, visibility, branchId, year, isPinned } = req.body;

  if (title !== undefined) announcement.title = title;
  if (content !== undefined) announcement.content = content;
  if (visibility !== undefined) announcement.visibility = visibility;
  if (branchId !== undefined) announcement.branch = branchId || null;
  if (year !== undefined) announcement.year = year ? Number(year) : null;
  if (isPinned !== undefined) announcement.isPinned = Boolean(isPinned);

  if (announcement.visibility === 'public') {
    announcement.branch = null;
    announcement.year = null;
  }

  await announcement.save();

  const populatedAnnouncement = await Announcement.findById(announcement._id)
    .populate('createdBy', 'name role')
    .populate('branch', 'name code');

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
