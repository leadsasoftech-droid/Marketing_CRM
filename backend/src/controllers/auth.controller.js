const User = require("../models/user.model");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const generateAccessId = require("../utils/generateAccessId");
const signToken = require("../utils/signToken");

function serializeUser(user) {
  return user.toJSON();
}

async function buildUniqueAccessId(preferredAccessId, currentUserId = null) {
  if (preferredAccessId) {
    const normalizedAccessId = preferredAccessId.toUpperCase();
    const existingUser = await User.findOne({ crmAccessId: normalizedAccessId }).select("_id");

    if (existingUser && String(existingUser._id) !== String(currentUserId || "")) {
      throw new ApiError(409, "That CRM access ID is already assigned.");
    }

    return normalizedAccessId;
  }

  let accessId = generateAccessId();
  let exists = await User.exists({ crmAccessId: accessId });

  while (exists) {
    accessId = generateAccessId();
    exists = await User.exists({ crmAccessId: accessId });
  }

  return accessId;
}

async function createManagedUser({
  name,
  email,
  password,
  phoneNumber,
  role,
  createdBy,
  crmAccessId,
}) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, "An account with that email already exists.");
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    phoneNumber,
    role,
    createdBy: createdBy || null,
    crmAccessId: await buildUniqueAccessId(crmAccessId),
  });

  return user;
}

const signup = asyncHandler(async (req, res) => {
  const existingUsersCount = await User.countDocuments();

  if (existingUsersCount > 0 && !env.allowPublicSignup) {
    throw new ApiError(
      403,
      "Public signup is disabled. Ask a super admin to create your CRM account.",
    );
  }

  const role = existingUsersCount === 0 ? "super_admin" : "admin";
  const user = await createManagedUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phoneNumber: req.body.phoneNumber,
    role,
  });

  res.status(201).json({
    success: true,
    message:
      role === "super_admin"
        ? "Super admin account created successfully."
        : "Admin account created successfully.",
    data: {
      token: signToken(user),
      user: serializeUser(user),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const identifier = String(req.body.identifier).trim();
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { crmAccessId: identifier.toUpperCase() },
    ],
  }).select("+password");

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid login credentials.");
  }

  const isPasswordValid = await user.comparePassword(req.body.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid login credentials.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      token: signToken(user),
      user: serializeUser(user),
    },
  });
});

const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Profile fetched successfully.",
    data: {
      user: serializeUser(req.user),
    },
  });
});

const createAdmin = asyncHandler(async (req, res) => {
  const user = await createManagedUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phoneNumber: req.body.phoneNumber,
    role: "admin",
    createdBy: req.user._id,
    crmAccessId: req.body.crmAccessId,
  });

  res.status(201).json({
    success: true,
    message: "Admin user created successfully.",
    data: {
      user: serializeUser(user),
    },
  });
});

const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Users fetched successfully.",
    data: {
      users,
    },
  });
});

const assignAccessId = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  user.crmAccessId = await buildUniqueAccessId(req.body.crmAccessId, user._id);
  await user.save();

  res.status(200).json({
    success: true,
    message: "CRM access ID assigned successfully.",
    data: {
      user: serializeUser(user),
    },
  });
});

const updateOwnPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");

  if (!user || !user.isActive) {
    throw new ApiError(401, "Your account is inactive or no longer exists.");
  }

  if (user.role !== "super_admin") {
    throw new ApiError(403, "Only the super admin can update this password.");
  }

  user.password = req.body.newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully.",
    data: {
      user: serializeUser(user),
    },
  });
});

const resetAdminPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.role === "super_admin") {
    throw new ApiError(403, "Cannot reset a super admin's password from this screen. Use the profile page instead.");
  }

  user.password = req.body.newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: `Password for ${user.name} has been reset successfully.`,
    data: {
      user: serializeUser(user),
    },
  });
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.role === "super_admin") {
    throw new ApiError(403, "Cannot delete a super admin account.");
  }

  await User.findByIdAndDelete(req.params.userId);

  res.status(200).json({
    success: true,
    message: "Admin user deleted successfully.",
  });
});

module.exports = {
  assignAccessId,
  createAdmin,
  deleteAdmin,
  getProfile,
  listUsers,
  login,
  resetAdminPassword,
  signup,
  updateOwnPassword,
};
