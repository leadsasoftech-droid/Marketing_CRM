const express = require("express");
const providerController = require("../controllers/provider.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const router = express.Router();

router.use(authenticate, authorize("super_admin"));

router.get("/fast2sms/wallet", providerController.getWalletBalance);
router.get("/fast2sms/block", providerController.getBlockedUsers);
router.post("/fast2sms/block", providerController.blockUser);
router.delete("/fast2sms/block/:number", providerController.unblockUser);

module.exports = router;
