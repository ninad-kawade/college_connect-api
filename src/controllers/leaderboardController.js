const asyncHandler = require('express-async-handler');

const { getLeaderboardData } = require('../services/leaderboardService');

const getLeaderboard = asyncHandler(async (req, res) => {
  const { scope = 'global' } = req.query;
  const data = await getLeaderboardData({ scope, user: req.user });

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getLeaderboard,
};
