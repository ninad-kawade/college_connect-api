const asyncHandler = require('express-async-handler');

const AcademicYear = require('../models/AcademicYear');
const Branch = require('../models/Branch');
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

module.exports = {
  signup,
  login,
  adminLogin,
  getMe,
  logout,
};
