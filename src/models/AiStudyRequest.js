const mongoose = require('mongoose');

const aiStudyRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['doubt_explanation', 'material_summary'],
      required: true,
    },
    sourceType: {
      type: String,
      enum: ['question', 'material'],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      default: '',
    },
    result: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    regeneratedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiStudyRequest',
      default: null,
    },
  },
  { timestamps: true }
);

aiStudyRequestSchema.index({ user: 1, sourceType: 1, sourceId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('AiStudyRequest', aiStudyRequestSchema);
