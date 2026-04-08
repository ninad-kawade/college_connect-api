const User = require('../models/User');

const seedSuperAdmin = async () => {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    return;
  }

  const existingAdmin = await User.findOne({ email: email.toLowerCase() });
  if (existingAdmin) {
    return;
  }

  await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'superadmin',
    status: 'active',
  });

  console.log(`Seeded super admin account for ${email}`);
};

module.exports = seedSuperAdmin;
