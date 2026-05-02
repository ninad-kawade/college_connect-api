const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    category: {
      type: String,
      enum: ['exam', 'event', 'placement', 'deadline', 'general'],
      default: 'general',
    },
    visibility: {
      type: String,
      enum: ['public'],
      default: 'public',
    },
    startsAt: {
      type: Date,
      required: [true, 'Event start date is required'],
    },
    endsAt: {
      type: Date,
      default: null,
    },
    date: {
      type: Date,
      default: undefined,
    },
    status: {
      type: String,
      enum: ['ongoing', 'upcoming', 'ended'],
      default: 'upcoming',
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
