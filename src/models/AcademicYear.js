const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    yearNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AcademicYear', academicYearSchema);
