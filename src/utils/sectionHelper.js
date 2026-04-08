const isSameSectionAccess = (user, branchId, year) => {
  if (user.role === 'superadmin') {
    return true;
  }

  if (!user.branch || !user.currentYear) {
    return false;
  }

  return user.branch.toString() === branchId.toString() && Number(user.currentYear) === Number(year);
};

module.exports = {
  isSameSectionAccess,
};
