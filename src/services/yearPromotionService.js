const User = require('../models/User');

const promoteEligibleStudents = async ({ force = false } = {}) => {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const query = {
    role: 'student',
    status: 'active',
  };

  if (!force) {
    query.yearUpdatedAt = { $lte: oneYearAgo };
  }

  const students = await User.find(query);
  let promotedCount = 0;
  let alumniCount = 0;

  for (const student of students) {
    if (!student.currentYear || !student.totalYears) {
      continue;
    }

    if (student.currentYear >= student.totalYears) {
      student.role = 'alumni';
      student.status = 'graduated';
      student.currentYear = null;
      student.yearUpdatedAt = now;
      await student.save();
      alumniCount += 1;
      continue;
    }

    student.currentYear += 1;
    student.yearUpdatedAt = now;
    await student.save();
    promotedCount += 1;
  }

  return {
    promotedCount,
    alumniCount,
    processedCount: promotedCount + alumniCount,
  };
};

module.exports = {
  promoteEligibleStudents,
};
