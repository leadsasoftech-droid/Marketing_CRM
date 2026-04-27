const ApiError = require("../utils/apiError");

function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  let normalizedError = error;

  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || "field";
    normalizedError = new ApiError(409, `${duplicateField} already exists.`);
  } else if (error?.name === "ValidationError") {
    normalizedError = new ApiError(
      422,
      "Validation failed.",
      Object.values(error.errors || {}).map((entry) => ({
        field: entry.path,
        message: entry.message,
      })),
    );
  } else if (error?.name === "MulterError") {
    normalizedError = new ApiError(400, error.message);
  }

  const statusCode = normalizedError.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: normalizedError.message || "Something went wrong.",
    errors: normalizedError.errors || undefined,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
