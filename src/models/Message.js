const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
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
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'file'],
      default: 'text',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

messageSchema.index({ branch: 1, year: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
