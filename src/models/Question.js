const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    answerCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

questionSchema.index({ branch: 1, year: 1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
