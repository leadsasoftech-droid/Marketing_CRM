const env = require("../config/env");
const MessageHistory = require("../models/messageHistory.model");
const { getWhatsappLogs } = require("./fast2sms.service");
const { applyWebhookStatusToHistory } = require("../utils/messageDeliveryState");

const SYNCABLE_STATUSES = new Set(["pending", "sent"]);

function isProviderSyncEnabled() {
  return env.whatsappApiMode === "live" && env.whatsappProvider === "fast2sms";
}

function toDateString(value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().slice(0, 10);
}

function extractProviderMessageId(status) {
  return (
    status?.request_id ||
    status?.message_id ||
    status?.meta_msg_id ||
    status?.id ||
    null
  );
}

function extractProviderStatusTimestamp(status) {
  const candidates = [
    status?.delivery_timestamp,
    status?.timestamp,
    status?.sent_timestamp,
  ];

  for (const candidate of candidates) {
    const parsed = Number.parseInt(candidate, 10);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function buildLatestStatusMap(entries) {
  const statusMap = new Map();

  for (const entry of entries) {
    if (entry?.type && entry.type !== "status_update") {
      continue;
    }

    const messageId = extractProviderMessageId(entry);
    if (!messageId) {
      continue;
    }

    const existing = statusMap.get(messageId);
    if (!existing || extractProviderStatusTimestamp(entry) >= extractProviderStatusTimestamp(existing)) {
      statusMap.set(messageId, entry);
    }
  }

  return statusMap;
}

function buildProviderStatusSignature(status) {
  if (!status) {
    return "";
  }

  return [
    extractProviderMessageId(status),
    String(status.status || "").toLowerCase(),
    extractProviderStatusTimestamp(status),
    String(status.status_description || ""),
  ].join(":");
}

async function syncHistoryDocumentsWithProvider(histories) {
  const candidates = histories.filter(
    (history) =>
      history &&
      SYNCABLE_STATUSES.has(history.status) &&
      String(history.metaMessageId || "").trim(),
  );

  if (!isProviderSyncEnabled() || candidates.length === 0) {
    return {
      matchedCount: candidates.length,
      updatedCount: 0,
    };
  }

  const from = toDateString(
    candidates.reduce(
      (oldest, history) =>
        !oldest || new Date(history.createdAt) < new Date(oldest) ? history.createdAt : oldest,
      null,
    ),
  );
  const to = toDateString(new Date());

  if (!from || !to) {
    return {
      matchedCount: candidates.length,
      updatedCount: 0,
    };
  }

  const logsResponse = await getWhatsappLogs({ from, to });
  const entries = Array.isArray(logsResponse?.data) ? logsResponse.data : [];
  const latestStatusMap = buildLatestStatusMap(entries);

  let updatedCount = 0;

  for (const history of candidates) {
    const providerStatus = latestStatusMap.get(history.metaMessageId);

    if (!providerStatus) {
      continue;
    }

    const currentSignature = buildProviderStatusSignature(history.metaResponse?.webhook);
    const nextSignature = buildProviderStatusSignature(providerStatus);

    if (currentSignature && currentSignature === nextSignature) {
      continue;
    }

    if (!applyWebhookStatusToHistory({ history, status: providerStatus })) {
      continue;
    }

    await history.save();
    updatedCount += 1;
  }

  return {
    matchedCount: candidates.length,
    updatedCount,
  };
}

async function syncRecentProviderStatuses({ ownerId = null, limit = 100, maxAgeDays = 7 } = {}) {
  if (!isProviderSyncEnabled()) {
    return {
      matchedCount: 0,
      updatedCount: 0,
    };
  }

  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const filter = {
    status: { $in: [...SYNCABLE_STATUSES] },
    metaMessageId: { $ne: "" },
    createdAt: { $gte: cutoffDate },
  };

  if (ownerId) {
    filter.owner = ownerId;
  }

  const histories = await MessageHistory.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);

  return syncHistoryDocumentsWithProvider(histories);
}

async function waitForProviderStatusSync(history, { attempts = 3, delayMs = 1500 } = {}) {
  if (!history || !String(history.metaMessageId || "").trim() || !isProviderSyncEnabled()) {
    return {
      matchedCount: 0,
      updatedCount: 0,
    };
  }

  let lastResult = {
    matchedCount: 0,
    updatedCount: 0,
  };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastResult = await syncHistoryDocumentsWithProvider([history]);

    if (history.status === "failed") {
      return lastResult;
    }

    if (history.status === "sent" && history.metaResponse?.webhook) {
      return lastResult;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return lastResult;
}

module.exports = {
  syncHistoryDocumentsWithProvider,
  syncRecentProviderStatuses,
  waitForProviderStatusSync,
};
