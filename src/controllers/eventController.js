const asyncHandler = require('express-async-handler');

const Event = require('../models/Event');

const getEvents = asyncHandler(async (req, res) => {
  const { status, category, from, to } = req.query;
  const query = { visibility: 'public' };

  if (status) query.status = status;
  if (category) query.category = category;
  if (from || to) {
    query.startsAt = {};
    if (from) query.startsAt.$gte = new Date(from);
    if (to) query.startsAt.$lte = new Date(to);
  }

  const events = await Event.find(query).populate('createdBy', 'name role').sort({ startsAt: 1 });

  res.status(200).json({
    success: true,
    data: events,
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const { title, description, category = 'general', startsAt, endsAt, status = 'upcoming' } = req.body;

  if (!title || !description || !startsAt) {
    res.status(400);
    throw new Error('title, description, and startsAt are required');
  }

  const event = await Event.create({
    title,
    description,
    category,
    startsAt,
    endsAt: endsAt || null,
    status,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event,
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  ['title', 'description', 'category', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  });
  if (req.body.startsAt !== undefined) event.startsAt = req.body.startsAt;
  if (req.body.endsAt !== undefined) event.endsAt = req.body.endsAt || null;
  if (req.body.isCancelled !== undefined) event.isCancelled = Boolean(req.body.isCancelled);

  await event.save();

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: event,
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  event.isCancelled = true;
  event.status = 'ended';
  await event.save();

  res.status(200).json({
    success: true,
    message: 'Event cancelled successfully',
    data: event,
  });
});

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
