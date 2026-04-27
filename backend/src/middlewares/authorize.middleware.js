const ApiError = require("../utils/apiError");

function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, "Authentication is required."));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, "You do not have permission to perform this action."));
      return;
    }

    next();
  };
}

module.exports = authorize;
