const User = require("../models/user.model");

const env = require("../config/env");

const DEFAULT_SUPER_ADMIN_ACCESS_ID = "SUPERADMIN";

async function ensureDefaultSuperAdmin() {
  if (!env.defaultSuperAdminEmail || !env.defaultSuperAdminPassword) {
    return null;
  }

  let user = await User.findOne({ email: env.defaultSuperAdminEmail });

  if (!user) {
    user = await User.create({
      name: env.defaultSuperAdminName || "Super Admin",
      email: env.defaultSuperAdminEmail,
      password: env.defaultSuperAdminPassword,
      role: "super_admin",
      crmAccessId: DEFAULT_SUPER_ADMIN_ACCESS_ID,
    });

    console.log(`Default super admin created for ${user.email}.`);
    return user;
  }

  let didRepairUser = false;

  if (user.role !== "super_admin") {
    user.role = "super_admin";
    didRepairUser = true;
  }

  if (!user.isActive) {
    user.isActive = true;
    didRepairUser = true;
  }

  if (!user.crmAccessId) {
    user.crmAccessId = DEFAULT_SUPER_ADMIN_ACCESS_ID;
    didRepairUser = true;
  }

  if (!user.name?.trim()) {
    user.name = env.defaultSuperAdminName || "Super Admin";
    didRepairUser = true;
  }

  if (didRepairUser) {
    await user.save();
    console.log(`Default super admin account repaired for ${user.email}.`);
  }

  return user;
}

module.exports = ensureDefaultSuperAdmin;
