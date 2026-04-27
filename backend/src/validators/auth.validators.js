const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const signupValidator = [
  body("name").trim().notEmpty().withMessage("Name is required.").isLength({ max: 100 }),
  body("email").trim().isEmail().withMessage("A valid email is required."),
  body("password")
    .trim()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("phoneNumber")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage("Phone number must be between 8 and 20 characters."),
];

const loginValidator = [
  body("identifier").trim().notEmpty().withMessage("Email or CRM access ID is required."),
  body("password").trim().notEmpty().withMessage("Password is required."),
];

const createAdminValidator = [
  body("name").trim().notEmpty().withMessage("Name is required.").isLength({ max: 100 }),
  body("email").trim().isEmail().withMessage("A valid email is required."),
  body("password")
    .trim()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("phoneNumber")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage("Phone number must be between 8 and 20 characters."),
  body("crmAccessId")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("CRM access ID can contain letters, numbers, and hyphens only."),
];

const assignAccessIdValidator = [
  param("userId")
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage("A valid user ID is required."),
  body("crmAccessId")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("CRM access ID can contain letters, numbers, and hyphens only."),
];

const updateOwnPasswordValidator = [
  body("newPassword")
    .trim()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long."),
  body("confirmNewPassword")
    .trim()
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("New password confirmation does not match."),
];

const resetAdminPasswordValidator = [
  param("userId")
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage("A valid user ID is required."),
  body("newPassword")
    .trim()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long."),
];

module.exports = {
  assignAccessIdValidator,
  createAdminValidator,
  loginValidator,
  resetAdminPasswordValidator,
  signupValidator,
  updateOwnPasswordValidator,
};
