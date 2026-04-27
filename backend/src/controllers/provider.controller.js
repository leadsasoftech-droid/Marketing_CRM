const fast2smsService = require("../services/fast2sms.service");
const asyncHandler = require("../utils/asyncHandler");
const env = require("../config/env");
const ApiError = require("../utils/apiError");

function buildRequestOrigin(req) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const protocol = String(forwardedProtocol || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = String(forwardedHost || req.get("host") || "")
    .split(",")[0]
    .trim();

  return host ? `${protocol}://${host}` : "";
}

function isLocalUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
  } catch (_error) {
    return true;
  }
}

const getWalletBalance = asyncHandler(async (req, res) => {
  const result = await fast2smsService.getWalletBalance();
  res.status(200).json({
    success: true,
    message: "Fast2SMS wallet balance fetched successfully.",
    data: result,
  });
});

const getBlockedUsers = asyncHandler(async (req, res) => {
  const result = await fast2smsService.getBlockedUsers();
  res.status(200).json({
    success: true,
    message: "Blocked WhatsApp users fetched successfully.",
    data: result,
  });
});

const blockUser = asyncHandler(async (req, res) => {
  const { number } = req.body;
  const result = await fast2smsService.blockUser(number);
  res.status(200).json({
    success: true,
    message: "WhatsApp user blocked successfully.",
    data: result,
  });
});

const unblockUser = asyncHandler(async (req, res) => {
  const { number } = req.params;
  const result = await fast2smsService.unblockUser(number);
  res.status(200).json({
    success: true,
    message: "WhatsApp user unblocked successfully.",
    data: result,
  });
});

const getWhatsappWebhook = asyncHandler(async (_req, res) => {
  const result = await fast2smsService.getWhatsappWebhookConfig();
  res.status(200).json({
    success: true,
    message: "Fast2SMS webhook configuration fetched successfully.",
    data: result,
  });
});

const syncWhatsappWebhook = asyncHandler(async (req, res) => {
  const preferredWebhookUrl = String(req.body?.webhookUrl || "").trim();
  const fallbackOrigin = env.backendPublicUrl || buildRequestOrigin(req);
  const webhookUrl = preferredWebhookUrl || fast2smsService.buildWebhookUrl(fallbackOrigin);

  if (!webhookUrl) {
    throw new ApiError(
      400,
      "A public backend URL is required before the delivery webhook can be enabled.",
    );
  }

  if (isLocalUrl(webhookUrl)) {
    throw new ApiError(
      400,
      "The detected backend URL is local-only. Set BACKEND_PUBLIC_URL or provide a public webhook URL.",
    );
  }

  const result = await fast2smsService.ensureWhatsappWebhook(webhookUrl);
  res.status(200).json({
    success: true,
    message: result.changed
      ? "Fast2SMS delivery webhook enabled successfully."
      : "Fast2SMS delivery webhook is already enabled.",
    data: result,
  });
});

module.exports = {
  blockUser,
  getBlockedUsers,
  getWalletBalance,
  getWhatsappWebhook,
  syncWhatsappWebhook,
  unblockUser,
};
