const User = require('../models/User');

const getLeaderboardData = async ({ scope = 'global', user }) => {
  const query = {
    role: { $in: ['student', 'alumni'] },
  };

  if (scope === 'section' && user.role !== 'superadmin') {
    query.branch = user.branch;
  }

  const users = await User.find(query)
    .populate('branch', 'name code')
    .select('name branch doubtsSolvedCount notesSharedCount upvotesReceivedCount reputationPoints role')
    .sort({
      reputationPoints: -1,
      doubtsSolvedCount: -1,
      notesSharedCount: -1,
      upvotesReceivedCount: -1,
    })
    .limit(20);

  return users.map((entry, index) => ({
    rank: index + 1,
    userId: entry._id,
    name: entry.name,
    role: entry.role,
    branch: entry.branch,
    doubtsSolved: entry.doubtsSolvedCount,
    notesShared: entry.notesSharedCount,
    upvotesReceived: entry.upvotesReceivedCount,
    score: entry.reputationPoints,
  }));
};

module.exports = {
  getLeaderboardData,
};
