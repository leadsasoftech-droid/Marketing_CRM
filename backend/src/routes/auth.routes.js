const express = require("express");

const {
  assignAccessId,
  createAdmin,
  deleteAdmin,
  getProfile,
  listUsers,
  login,
  resetAdminPassword,
  signup,
  updateOwnPassword,
} = require("../controllers/auth.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validateRequest = require("../middlewares/validate.middleware");
const {
  assignAccessIdValidator,
  createAdminValidator,
  loginValidator,
  resetAdminPasswordValidator,
  signupValidator,
  updateOwnPasswordValidator,
} = require("../validators/auth.validators");

const router = express.Router();

router.post("/signup", signupValidator, validateRequest, signup);
router.post("/login", loginValidator, validateRequest, login);
router.get("/me", authenticate, getProfile);
router.patch(
  "/me/password",
  authenticate,
  authorize("super_admin"),
  updateOwnPasswordValidator,
  validateRequest,
  updateOwnPassword,
);
router.get("/users", authenticate, authorize("super_admin"), listUsers);
router.post(
  "/admins",
  authenticate,
  authorize("super_admin"),
  createAdminValidator,
  validateRequest,
  createAdmin,
);
router.patch(
  "/users/:userId/access-id",
  authenticate,
  authorize("super_admin"),
  assignAccessIdValidator,
  validateRequest,
  assignAccessId,
);
router.delete(
  "/admins/:userId",
  authenticate,
  authorize("super_admin"),
  deleteAdmin,
);
router.patch(
  "/admins/:userId/password",
  authenticate,
  authorize("super_admin"),
  resetAdminPasswordValidator,
  validateRequest,
  resetAdminPassword,
);

module.exports = router;
