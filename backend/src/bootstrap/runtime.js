const connectDatabase = require("../config/database");
const env = require("../config/env");
const ensureDefaultSuperAdmin = require("../services/bootstrap.service");
const { ensureWhatsappWebhook } = require("../services/fast2sms.service");

let runtimeReadyPromise = null;

function initializeRuntime() {
  if (!runtimeReadyPromise) {
    runtimeReadyPromise = (async () => {
      await connectDatabase();
      await ensureDefaultSuperAdmin();

      if (
        env.fast2smsWebhookAutoSync &&
        env.whatsappApiMode === "live" &&
        env.whatsappProvider === "fast2sms" &&
        env.backendPublicUrl
      ) {
        try {
          const result = await ensureWhatsappWebhook(env.backendPublicUrl);

          if (result.changed) {
            console.log(`Fast2SMS webhook synced to ${result.webhookUrl}.`);
          }
        } catch (error) {
          console.warn(`Fast2SMS webhook sync skipped: ${error.message}`);
        }
      }
    })().catch((error) => {
      runtimeReadyPromise = null;
      throw error;
    });
  }

  return runtimeReadyPromise;
}

async function ensureRuntimeReady(_req, _res, next) {
  try {
    await initializeRuntime();
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  ensureRuntimeReady,
  initializeRuntime,
};
