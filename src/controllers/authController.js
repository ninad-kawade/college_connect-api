const asyncHandler = require('express-async-handler');

const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const User = require('../models/User');
const { buildAuthResponse } = require('../services/authService');

const setAuthCookie = (res, token) => {
  const expiresInDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7);

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: expiresInDays * 24 * 60 * 60 * 1000,
  });
};

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, branchId, year } = req.body;

  if (!name || !email || !password || !branchId || !year) {
    res.status(400);
    throw new Error('Name, email, password, branchId, and year are required');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const [branch, academicYear] = await Promise.all([
    Branch.findOne({ _id: branchId, isActive: true }),
    AcademicYear.findOne({ yearNumber: Number(year), isActive: true }),
  ]);

  if (!branch) {
    res.status(400);
    throw new Error('Selected branch is invalid or inactive');
  }

  if (!academicYear) {
    res.status(400);
    throw new Error('Selected academic year is invalid or inactive');
  }

  if (Number(year) > branch.totalYears) {
    res.status(400);
    throw new Error('Selected year exceeds the branch total years');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    branch: branch._id,
    currentYear: Number(year),
    totalYears: branch.totalYears,
  });

  const populatedUser = await User.findById(user._id)
    .populate('branch', 'name code totalYears')
    .select('+password');

  res.status(201).json({
    success: true,
    message: 'Student registered successfully',
    data: buildAuthResponse(populatedUser),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() })
    .populate('branch', 'name code totalYears')
    .select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.role === 'superadmin') {
    res.status(403);
    throw new Error('Use admin login for super admin account');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const authData = buildAuthResponse(user);
  setAuthCookie(res, authData.token);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: authData,
  });
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    role: 'superadmin',
  })
    .populate('branch', 'name code totalYears')
    .select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid admin credentials');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid admin credentials');
  }

  const authData = buildAuthResponse(user);
  setAuthCookie(res, authData.token);

  res.status(200).json({
    success: true,
    message: 'Admin login successful',
    data: authData,
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('branch', 'name code totalYears');

  res.status(200).json({
    success: true,
    data: user,
  });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(404);
    throw new Error('No account found with this email');
  }

  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const recentOtpCount = await PasswordResetOtp.countDocuments({
    email: normalizedEmail,
    createdAt: { $gte: windowStart },
  });

  if (recentOtpCount >= 3) {
    res.status(429);
    throw new Error('Too many OTP requests. Please try again later');
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await PasswordResetOtp.create({
    email: normalizedEmail,
    otp,
    expiresAt,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Password reset OTP for ${normalizedEmail}: ${otp}`);
  }

  res.status(200).json({
    success: true,
    message: 'Password reset OTP sent successfully',
  });
});

const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    res.status(400);
    throw new Error('Email, OTP, and new password are required');
  }

  const normalizedEmail = email.toLowerCase();
  const otpRecord = await PasswordResetOtp.findOne({
    email: normalizedEmail,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select('+otp');

  if (!otpRecord) {
    res.status(400);
    throw new Error('OTP is invalid or expired');
  }

  otpRecord.attempts += 1;

  if (otpRecord.otp !== otp) {
    await otpRecord.save();
    res.status(400);
    throw new Error('OTP is invalid or expired');
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('No account found with this email');
  }

  user.password = password;
  await user.save();

  otpRecord.usedAt = new Date();
  await otpRecord.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
  });
});

module.exports = {
  signup,
  login,
  adminLogin,
  getMe,
  logout,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
};
