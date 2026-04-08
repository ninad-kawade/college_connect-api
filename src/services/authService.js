const generateToken = require('../utils/generateToken');

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  branch: user.branch,
  currentYear: user.currentYear,
  totalYears: user.totalYears,
  bio: user.bio,
  profileImage: user.profileImage,
  reputationPoints: user.reputationPoints,
  doubtsSolvedCount: user.doubtsSolvedCount,
  notesSharedCount: user.notesSharedCount,
  upvotesReceivedCount: user.upvotesReceivedCount,
  yearUpdatedAt: user.yearUpdatedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildAuthResponse = (user) => ({
  user: sanitizeUser(user),
  token: generateToken(user._id),
});

module.exports = {
  sanitizeUser,
  buildAuthResponse,
};
