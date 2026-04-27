const env = require("../config/env");
const ApiError = require("../utils/apiError");

function getHeaders() {
  if (!env.fast2smsApiKey) {
    throw new ApiError(500, "Fast2SMS API key is not configured.");
  }

  return {
    authorization: env.fast2smsApiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function buildWhatsappBaseEndpoint() {
  if (!env.fast2smsPhoneNumberId) {
    throw new ApiError(500, "Fast2SMS WhatsApp phone number ID is not configured.");
  }

  return `https://www.fast2sms.com/dev/whatsapp/${env.fast2smsApiVersion}/${env.fast2smsPhoneNumberId}`;
}

function buildWebhookUrl(baseUrl) {
  const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  return normalizedBaseUrl ? `${normalizedBaseUrl}/api/messages/webhook` : "";
}

function getAuthorizationQueryEndpoint(rawUrl) {
  const endpoint = new URL(rawUrl);
  endpoint.searchParams.set("authorization", env.fast2smsApiKey);
  return endpoint;
}

function normalizeProviderMessage(message) {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(" ");
  }

  return typeof message === "string" ? message : "";
}

async function handleResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  const explicitFailure =
    Boolean(payload?.error) ||
    payload?.return === false ||
    payload?.success === false ||
    payload?.status === false;

  if (!response.ok || explicitFailure) {
    const error = new ApiError(
      response.ok ? 502 : response.status,
      payload?.error?.message ||
        normalizeProviderMessage(payload?.message) ||
        fallbackMessage,
    );
    error.metaResponse = payload;
    throw error;
  }

  return payload;
}

async function getWalletBalance() {
  const endpoint = getAuthorizationQueryEndpoint("https://www.fast2sms.com/dev/wallet");
  const response = await fetch(endpoint, {
    method: "GET",
  });

  return handleResponse(response, "Unable to fetch Fast2SMS wallet balance.");
}

async function getWhatsappLogs({ from, to }) {
  const endpoint = getAuthorizationQueryEndpoint("https://www.fast2sms.com/dev/whatsapp_logs");
  endpoint.searchParams.set("from", String(from || "").trim());
  endpoint.searchParams.set("to", String(to || "").trim());

  const response = await fetch(endpoint, {
    method: "GET",
  });

  return handleResponse(response, "Unable to fetch Fast2SMS WhatsApp logs.");
}

async function getBlockedUsers() {
  const endpoint = getAuthorizationQueryEndpoint(`${buildWhatsappBaseEndpoint()}/block_users`);
  const response = await fetch(endpoint, {
    method: "GET",
  });

  return handleResponse(response, "Unable to fetch blocked WhatsApp users.");
}

async function blockUser(number) {
  const endpoint = `${buildWhatsappBaseEndpoint()}/block_users`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      blocking_users: [String(number).trim()],
    }),
  });

  return handleResponse(response, "Unable to block the WhatsApp user.");
}

async function unblockUser(number) {
  const endpoint = `${buildWhatsappBaseEndpoint()}/block_users`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: getHeaders(),
    body: JSON.stringify({
      blocking_users: [String(number).trim()],
    }),
  });

  return handleResponse(response, "Unable to unblock the WhatsApp user.");
}

async function getWhatsappWebhookConfig() {
  const endpoint = getAuthorizationQueryEndpoint("https://www.fast2sms.com/dev/webhook/whatsapp/get");
  const response = await fetch(endpoint, {
    method: "GET",
  });

  return handleResponse(response, "Unable to fetch the Fast2SMS webhook configuration.");
}

async function setWhatsappWebhookConfig({ webhookUrl, webhookStatus = "enable" }) {
  const response = await fetch("https://www.fast2sms.com/dev/webhook/whatsapp/set", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      webhook_url: webhookUrl,
      webhook_status: webhookStatus,
    }),
  });

  return handleResponse(response, "Unable to update the Fast2SMS webhook configuration.");
}

async function ensureWhatsappWebhook(baseUrlOrWebhookUrl) {
  const normalizedInput = String(baseUrlOrWebhookUrl || "").trim();
  const webhookUrl = normalizedInput.includes("/api/messages/webhook")
    ? normalizedInput
    : buildWebhookUrl(normalizedInput);

  if (!webhookUrl) {
    throw new ApiError(
      400,
      "A public backend URL is required before the Fast2SMS delivery webhook can be enabled.",
    );
  }

  const currentConfigResponse = await getWhatsappWebhookConfig();
  const currentConfig = currentConfigResponse?.data || {};
  const needsUpdate =
    currentConfig.webhook_url !== webhookUrl || currentConfig.webhook_status !== "enable";

  if (!needsUpdate) {
    return {
      changed: false,
      webhookUrl,
      config: currentConfig,
      previousConfig: currentConfig,
    };
  }

  const updateResponse = await setWhatsappWebhookConfig({
    webhookUrl,
    webhookStatus: "enable",
  });

  return {
    changed: true,
    webhookUrl,
    config: updateResponse?.data || {},
    previousConfig: currentConfig,
  };
}

module.exports = {
  blockUser,
  buildWebhookUrl,
  ensureWhatsappWebhook,
  getBlockedUsers,
  getWhatsappLogs,
  getWalletBalance,
  getWhatsappWebhookConfig,
  setWhatsappWebhookConfig,
  unblockUser,
};
