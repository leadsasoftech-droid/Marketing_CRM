const express = require("express");

const {
  clearQueuedMessages,
  getMessageHistory,
  getMessageHistoryById,
  sendBulkMessages,
  sendSingleMessage,
  verifyDeliveryWebhook,
  handleDeliveryWebhook,
} = require("../controllers/message.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const { uploadBulkFile } = require("../middlewares/upload.middleware");
const validateRequest = require("../middlewares/validate.middleware");
const {
  bulkMessageValidator,
  messageHistoryByIdValidator,
  messageHistoryQueryValidator,
  sendMessageValidator,
} = require("../validators/message.validators");

const router = express.Router();

// Webhook must be accessible without our app's JWT token
router.get("/webhook", verifyDeliveryWebhook);
router.post("/webhook", handleDeliveryWebhook);

router.use(authenticate, authorize("super_admin", "admin"));
router.post("/send", sendMessageValidator, validateRequest, sendSingleMessage);
router.post(
  "/bulk",
  uploadBulkFile.single("file"),
  bulkMessageValidator,
  validateRequest,
  sendBulkMessages,
);
router.delete("/queued", clearQueuedMessages);
router.get("/history", messageHistoryQueryValidator, validateRequest, getMessageHistory);
router.get(
  "/history/:historyId",
  messageHistoryByIdValidator,
  validateRequest,
  getMessageHistoryById,
);

module.exports = router;
