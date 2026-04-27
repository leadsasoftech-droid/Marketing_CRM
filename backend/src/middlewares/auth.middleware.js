const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const verifyToken = require("../utils/verifyToken");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication token is missing.");
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  const user = await User.findById(decoded.userId);

  if (!user || !user.isActive) {
    throw new ApiError(401, "Your account is inactive or no longer exists.");
  }

  req.user = user;
  next();
});

module.exports = authenticate;
