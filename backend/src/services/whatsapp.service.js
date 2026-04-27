const crypto = require("crypto");

const env = require("../config/env");
const ApiError = require("../utils/apiError");
const normalizePhoneNumber = require("../utils/normalizePhoneNumber");

// ---------------------------------------------------------------------------
// Fast2SMS — Meta-verified WhatsApp Cloud API
// Endpoint: POST https://www.fast2sms.com/dev/whatsapp/{version}/{phone_number_id}/messages
// Docs:     https://docs.fast2sms.com
// ---------------------------------------------------------------------------

/**
 * Build the Meta-format API endpoint URL.
 * @returns {string}
 */
function buildEndpoint() {
  return `https://www.fast2sms.com/dev/whatsapp/${env.fast2smsApiVersion}/${env.fast2smsPhoneNumberId}/messages`;
}

/**
 * Build Meta-format request body for an approved template message.
 * Template messages work outside the 24-hour conversation window.
 * @param {string} to  – Recipient phone number (digits only, with country code).
 * @returns {object}
 */
function buildTemplateBody(to) {
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: env.fast2smsDefaultTemplate,
      language: {
        code: env.fast2smsDefaultTemplateLang,
      },
    },
  };

  // If the template has a video header, include the header component.
  // Without this, Meta returns error #132012:
  // "header component parameter should not be empty"
  if (env.fast2smsTemplateHeaderVideoUrl) {
    body.template.components = [
      {
        type: "header",
        parameters: [
          {
            type: "video",
            video: {
              link: env.fast2smsTemplateHeaderVideoUrl,
            },
          },
        ],
      },
    ];
  }

  return body;
}

/**
 * Build Meta-format request body for a free-form text message.
 * Text messages only work within the 24-hour conversation window.
 * @param {string} to       – Recipient phone number.
 * @param {string} message  – Message text body.
 * @returns {object}
 */
function buildTextBody(to, message) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      body: message,
    },
  };
}

function normalizeProviderMessage(message) {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(" ");
  }

  return typeof message === "string" ? message : "";
}

function extractProviderMessageId(payload) {
  return payload?.messages?.[0]?.id || payload?.data?.message_id || payload?.message_id || null;
}

function extractProviderMessageStatus(payload) {
  return (
    payload?.messages?.[0]?.message_status ||
    payload?.data?.message_status ||
    payload?.message_status ||
    null
  );
}

/**
 * Send a WhatsApp message via Fast2SMS using the official Meta Cloud API format.
 *
 * Uses approved template messages by default. Falls back to free-form text
 * only if an explicit message is provided AND no default template is configured.
 *
 * @param {{ to: string, message?: string }} params
 * @returns {Promise<object>}
 */
async function sendViaFast2Sms({ to, message }) {
  if (!env.fast2smsApiKey || !env.fast2smsPhoneNumberId) {
    throw new ApiError(
      500,
      "Fast2SMS credentials are missing. Set FAST2SMS_API_KEY and FAST2SMS_PHONE_NUMBER_ID.",
    );
  }

  // Decide whether to send a template or free-form text.
  // Templates are the default (they work outside the 24-hour window).
  const useTemplate = Boolean(env.fast2smsDefaultTemplate);

  if (!useTemplate && !message) {
    throw new ApiError(
      400,
      "No message template is configured and no message text was provided.",
    );
  }

  const body = useTemplate ? buildTemplateBody(to) : buildTextBody(to, message);
  const endpoint = buildEndpoint();

  // Abort after 15 s to avoid hanging connections.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: env.fast2smsApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    const providerMessageStatus = extractProviderMessageStatus(payload);
    const explicitFailure =
      Boolean(payload?.error) ||
      payload?.success === false ||
      payload?.return === false ||
      payload?.status === false ||
      Number(payload?.status_code) >= 400 ||
      providerMessageStatus === "failed";

    // Fast2SMS may return HTTP 200 even on failure — the error lives
    // inside the JSON body. Check BOTH the HTTP status and payload.error.
    if (!response.ok || explicitFailure) {
      const error = new ApiError(
        response.ok ? 502 : response.status,
        payload?.error?.message ||
          payload?.errors?.[0]?.message ||
          normalizeProviderMessage(payload?.message) ||
          "Fast2SMS WhatsApp API request failed.",
      );
      error.metaResponse = payload;
      throw error;
    }

    const providerMessageId = extractProviderMessageId(payload);

    return {
      provider: "fast2sms",
      mode: "live",
      messageId: providerMessageId,
      providerStatus: providerMessageStatus,
      warning: providerMessageId
        ? ""
        : "Provider accepted the request but did not return a trackable message ID.",
      to,
      templateName: useTemplate ? env.fast2smsDefaultTemplate : null,
      raw: payload,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError(504, "Timed out while sending the WhatsApp message.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API — single entry point for all providers & modes
// ---------------------------------------------------------------------------

/**
 * Send a WhatsApp text / template message to a single recipient.
 *
 * In **mock** mode a fake delivery receipt is returned without hitting any
 * external API (zero cost).
 *
 * In **live** mode the configured provider (fast2sms) is called exactly once.
 *
 * @param {{ to: string, message?: string }} params
 * @returns {Promise<object>}
 */
async function sendTextMessage({ to, message }) {
  const normalizedPhoneNumber = normalizePhoneNumber(to);
  const trimmedMessage = String(message || "").trim();

  if (!normalizedPhoneNumber) {
    throw new ApiError(400, "A valid recipient phone number is required.");
  }

  // ---- Mock mode (no external calls, no cost) ----
  if (env.whatsappApiMode === "mock") {
    return {
      provider: env.whatsappProvider,
      mode: "mock",
      messageId: `mock-${crypto.randomUUID()}`,
      to: normalizedPhoneNumber,
      templateName: null,
      raw: {
        messaging_product: "whatsapp",
        contacts: [{ input: normalizedPhoneNumber }],
      },
    };
  }

  // ---- Live mode — Fast2SMS Meta Cloud API ----
  if (env.whatsappProvider === "fast2sms") {
    return sendViaFast2Sms({
      to: normalizedPhoneNumber,
      message: trimmedMessage || undefined,
    });
  }

  throw new ApiError(
    500,
    "Unsupported WhatsApp provider configured. Use WHATSAPP_PROVIDER=fast2sms.",
  );
}

module.exports = {
  sendTextMessage,
};
