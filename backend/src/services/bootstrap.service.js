const User = require("../models/user.model");

const env = require("../config/env");

async function ensureDefaultSuperAdmin() {
  if (!env.defaultSuperAdminEmail || !env.defaultSuperAdminPassword) {
    return null;
  }

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    return null;
  }

  const user = await User.create({
    name: env.defaultSuperAdminName || "Super Admin",
    email: env.defaultSuperAdminEmail,
    password: env.defaultSuperAdminPassword,
    role: "super_admin",
    crmAccessId: "SUPERADMIN",
  });

  console.log(`Default super admin created for ${user.email}.`);
  return user;
}

module.exports = ensureDefaultSuperAdmin;
