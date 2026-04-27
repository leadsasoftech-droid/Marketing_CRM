const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

function parseList(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInteger(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/whatsapp-crm",
  backendPublicUrl: (
    process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_API_URL || ""
  )
    .trim()
    .replace(/\/+$/, ""),
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bodyLimit: process.env.BODY_LIMIT || "1mb",
  corsOrigins: parseList(process.env.CORS_ORIGINS, [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
  corsAllowVercelOrigins: parseBoolean(process.env.CORS_ALLOW_VERCEL_ORIGINS, false),
  allowPublicSignup: parseBoolean(process.env.ALLOW_PUBLIC_SIGNUP, false),
  uploadMaxFileSizeMb: parseInteger(process.env.UPLOAD_MAX_FILE_SIZE_MB, 5),
  bulkSendConcurrency: parseInteger(process.env.BULK_SEND_CONCURRENCY, 5),
  messageDispatchMode:
    (process.env.MESSAGE_DISPATCH_MODE || (process.env.VERCEL ? "direct" : "queue")).toLowerCase(),
  directBulkMaxRecipients: parseInteger(process.env.DIRECT_BULK_MAX_RECIPIENTS, 25),
  defaultCountryCode: (process.env.DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, ""),
  whatsappApiMode: process.env.WHATSAPP_API_MODE || "mock",
  whatsappProvider: (process.env.WHATSAPP_PROVIDER || "fast2sms").toLowerCase(),
  fast2smsApiKey: process.env.FAST2SMS_API_KEY || "",
  fast2smsPhoneNumberId: process.env.FAST2SMS_PHONE_NUMBER_ID || "",
  fast2smsApiVersion: process.env.FAST2SMS_API_VERSION || "v24.0",
  fast2smsDefaultTemplate: process.env.FAST2SMS_DEFAULT_TEMPLATE || "",
  fast2smsDefaultTemplateLang: process.env.FAST2SMS_DEFAULT_TEMPLATE_LANG || "en",
  fast2smsTemplateHeaderVideoUrl: process.env.FAST2SMS_TEMPLATE_HEADER_VIDEO_URL || "",
  fast2smsWebhookAutoSync: parseBoolean(process.env.FAST2SMS_WEBHOOK_AUTO_SYNC, true),
  whatsappWebhookVerifyToken:
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    process.env.FAST2SMS_WEBHOOK_VERIFY_TOKEN ||
    "",
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: parseInteger(process.env.REDIS_PORT, 6379),
  defaultSuperAdminName: process.env.DEFAULT_SUPER_ADMIN_NAME || "Super Admin",
  defaultSuperAdminEmail: (
    process.env.DEFAULT_SUPER_ADMIN_EMAIL || "superadmin@gmail.com"
  )
    .toLowerCase()
    .trim(),
  defaultSuperAdminPassword: process.env.DEFAULT_SUPER_ADMIN_PASSWORD || "superadmin",
};

if (env.nodeEnv === "production" && env.jwtSecret === "change-me-in-production") {
  throw new Error("JWT_SECRET must be configured in production.");
}

if (!["queue", "direct"].includes(env.messageDispatchMode)) {
  throw new Error("MESSAGE_DISPATCH_MODE must be either 'queue' or 'direct'.");
}

module.exports = env;
