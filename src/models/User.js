const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'superadmin', 'alumni'],
      default: 'student',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated'],
      default: 'active',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    currentYear: {
      type: Number,
      min: 1,
      default: null,
    },
    totalYears: {
      type: Number,
      min: 1,
      default: null,
    },
    joinedAcademicYear: {
      type: Number,
      default: null,
    },
    yearUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    profileImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    reputationPoints: {
      type: Number,
      default: 0,
    },
    doubtsSolvedCount: {
      type: Number,
      default: 0,
    },
    notesSharedCount: {
      type: Number,
      default: 0,
    },
    upvotesReceivedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userSchema.index({ branch: 1, currentYear: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
