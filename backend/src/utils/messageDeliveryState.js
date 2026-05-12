const env = require("../config/env");

function isResponseEnvelope(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("send" in value || "webhook" in value),
  );
}

function buildMetaResponseEnvelope(metaResponse) {
  if (isResponseEnvelope(metaResponse)) {
    return {
      send: metaResponse.send || null,
      webhook: metaResponse.webhook || null,
    };
  }

  return {
    send: metaResponse || null,
    webhook: null,
  };
}

function mergeMetaResponse(metaResponse, patch) {
  return {
    ...buildMetaResponseEnvelope(metaResponse),
    ...patch,
  };
}

function shouldAwaitProviderConfirmation(delivery) {
  return Boolean(
    delivery?.mode === "live" &&
      delivery?.messageId,
  );
}

function applyAcceptedDeliveryToHistory({ history, delivery, message }) {
  history.metaMessageId = delivery.messageId || "";
  history.metaResponse = mergeMetaResponse(history.metaResponse, {
    send: delivery.raw,
  });
  history.errorMessage = "";

  if (delivery.templateName && !message) {
    history.message = `[Template: ${delivery.templateName}]`;
  }

  // Provider accepted the message — mark as "sent" immediately.
  // If delivery later fails, the webhook callback will update
  // the status to "failed" via applyWebhookStatusToHistory.
  history.status = "sent";
  history.sentAt = new Date();
}

function parseWebhookTimestamp(status) {
  const timestamp = Number.parseInt(status?.timestamp, 10);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const parsedDate = new Date(timestamp * 1000);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function extractWebhookErrorMessage(status) {
  if (status?.status_description) {
    return String(status.status_description).trim();
  }

  if (!Array.isArray(status?.errors)) {
    return "Delivery failed through Meta API. Message rejected or undeliverable.";
  }

  const providerMessage = status.errors
    .map((entry) => entry?.message || entry?.title || entry?.details || "")
    .find(Boolean);

  return providerMessage || "Delivery failed through Meta API. Message rejected or undeliverable.";
}

function applyWebhookStatusToHistory({ history, status }) {
  const normalizedStatus = String(status?.status || "").toLowerCase();

  history.metaResponse = mergeMetaResponse(history.metaResponse, {
    webhook: status,
  });

  if (normalizedStatus === "failed") {
    history.status = "failed";
    history.errorMessage = extractWebhookErrorMessage(status);
    return true;
  }

  if (!["sent", "delivered", "read"].includes(normalizedStatus)) {
    return false;
  }

  history.status = "sent";
  history.errorMessage = "";
  history.sentAt = parseWebhookTimestamp(status) || history.sentAt || new Date();
  return true;
}

function getDeliverySuccessMessage(delivery) {
  return shouldAwaitProviderConfirmation(delivery)
    ? "Message is processing. Status will update shortly."
    : "Message sent successfully.";
}

module.exports = {
  applyAcceptedDeliveryToHistory,
  applyWebhookStatusToHistory,
  getDeliverySuccessMessage,
};
