const mongoose = require("mongoose");
const { body, param, query } = require("express-validator");

const normalizePhoneNumber = require("../utils/normalizePhoneNumber");

const sendMessageValidator = [
  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .custom((value, { req }) => {
      const normalized = normalizePhoneNumber(value, req.body.countryCode);

      if (normalized.length < 10 || normalized.length > 15) {
        throw new Error("Please provide a valid phone number.");
      }

      return true;
    }),
  body("name")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name must be at most 100 characters."),
  body("countryCode")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{1,4}$/)
    .withMessage("Country code must contain 1 to 4 digits."),
  body("message")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 4096 })
    .withMessage("Message must be at most 4096 characters."),
];

const bulkMessageValidator = [
  body("message")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 4096 })
    .withMessage("Message must be at most 4096 characters."),
  body("file").custom((_value, { req }) => {
    if (!req.file) {
      throw new Error("A CSV, XLS, or XLSX file is required.");
    }

    return true;
  }),
];

const messageHistoryQueryValidator = [
  query("page")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
  query("status")
    .optional({ checkFalsy: true })
    .isIn(["queued", "pending", "sent", "failed"])
    .withMessage("Status must be queued, pending, sent, or failed."),
  query("source")
    .optional({ checkFalsy: true })
    .isIn(["manual", "bulk"])
    .withMessage("Source must be manual or bulk."),
  query("batchId")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Batch ID must be at most 100 characters."),
  query("search")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Search must be at most 200 characters."),
  query("ownerId")
    .optional({ checkFalsy: true })
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage("Owner ID must be a valid MongoDB ObjectId."),
];

const messageHistoryByIdValidator = [
  param("historyId")
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage("History ID must be a valid MongoDB ObjectId."),
];

module.exports = {
  bulkMessageValidator,
  messageHistoryByIdValidator,
  messageHistoryQueryValidator,
  sendMessageValidator,
};
