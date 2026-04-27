const multer = require("multer");

const env = require("../config/env");
const ApiError = require("../utils/apiError");

const allowedMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const storage = multer.memoryStorage();

const uploadBulkFile = multer({
  storage,
  limits: {
    fileSize: env.uploadMaxFileSizeMb * 1024 * 1024,
  },
  fileFilter(_req, file, callback) {
    const isSpreadsheet =
      allowedMimeTypes.has(file.mimetype) ||
      /\.(csv|xls|xlsx)$/i.test(file.originalname || "");

    if (!isSpreadsheet) {
      callback(
        new ApiError(400, "Only CSV, XLS, and XLSX files are allowed for bulk uploads."),
      );
      return;
    }

    callback(null, true);
  },
});

module.exports = {
  uploadBulkFile,
};
