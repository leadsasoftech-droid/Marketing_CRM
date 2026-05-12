const mongoose = require("mongoose");

const env = require("../config/env");
const MessageHistory = require("../models/messageHistory.model");
const { parseContactsFile } = require("../services/bulkUpload.service");
const { enqueueMessage, getWhatsappQueue } = require("../queues/whatsapp.queue");
const {
  syncHistoryDocumentsWithProvider,
  syncRecentProviderStatuses,
  waitForProviderStatusSync,
} = require("../services/providerStatusSync.service");
const { sendTextMessage } = require("../services/whatsapp.service");
const {
  applyAcceptedDeliveryToHistory,
  applyWebhookStatusToHistory,
  getDeliverySuccessMessage,
} = require("../utils/messageDeliveryState");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

function isDirectDispatchMode() {
  return env.messageDispatchMode === "direct";
}

function extractWebhookStatuses(payload) {
  const statuses = [];
  const directStatusCollections = [
    payload?.statuses,
    payload?.data?.statuses,
    payload?.value?.statuses,
    payload?.webhook?.statuses,
  ];

  for (const collection of directStatusCollections) {
    if (Array.isArray(collection)) {
      statuses.push(...collection.filter(Boolean));
    }
  }

  if (Array.isArray(payload?.entry)) {
    for (const entry of payload.entry) {
      for (const change of entry?.changes || []) {
        if (Array.isArray(change?.value?.statuses)) {
          statuses.push(...change.value.statuses.filter(Boolean));
        }
      }
    }
  }

  return statuses;
}

function extractWebhookMessageId(status) {
  return status?.id || status?.message_id || status?.meta_msg_id || status?.request_id || null;
}

function buildDirectBulkResponseMessage({ sentCount, pendingCount, failedCount }) {
  const parts = [];
  if (sentCount > 0) {
    parts.push(`${sentCount} sent`);
  }

  if (pendingCount > 0) {
    parts.push(`${pendingCount} processing`);
  }

  if (failedCount > 0 || parts.length === 0) {
    parts.push(`${failedCount} failed`);
  }

  if (parts.length === 1) {
    return `${parts[0]} during this upload.`;
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]} during this upload.`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)} during this upload.`;
}

async function deliverMessageImmediately({ history, to, message, skipProviderSync = false }) {
  try {
    const delivery = await sendTextMessage({ to, message });

    applyAcceptedDeliveryToHistory({ history, delivery, message });
    await history.save();

    if (!skipProviderSync) {
      try {
        await waitForProviderStatusSync(history);
      } catch (syncError) {
        console.warn(`Provider status sync skipped for ${history._id}: ${syncError.message}`);
      }
    }

    return {
      history,
      delivery,
    };
  } catch (error) {
    history.status = "failed";
    history.errorMessage = error.message;
    history.metaResponse = error.metaResponse || null;
    await history.save();
    throw error;
  }
}

// -------------------------------------------------------------------------
// Send a single WhatsApp message
// Creates the history record with status "queued" and adds a job to the
// BullMQ queue. The worker picks it up and updates the status to "sent"
// or "failed" (with automatic retries on transient errors).
// -------------------------------------------------------------------------
const sendSingleMessage = asyncHandler(async (req, res) => {
  const targetPhoneNumber = req.body.phoneNumber;
  const recipientName = req.body.name || "";
  const messageText = req.body.message || "";

  const history = await MessageHistory.create({
    owner: req.user._id,
    recipientName,
    phoneNumber: targetPhoneNumber,
    message: messageText || "[Template message]",
    source: "manual",
    status: "queued",
  });

  if (isDirectDispatchMode()) {
    const result = await deliverMessageImmediately({
      history,
      to: targetPhoneNumber,
      message: messageText || undefined,
    });

    if (result.history.status === "failed") {
      throw new ApiError(502, result.history.errorMessage || "Message delivery failed.");
    }

    res.status(200).json({
      success: true,
      message:
        result.history.status === "sent"
          ? "Message sent successfully."
          : getDeliverySuccessMessage(result.delivery),
      data: result,
    });
    return;
  }

  const job = await enqueueMessage({
    historyId: history._id.toString(),
    to: targetPhoneNumber,
    message: messageText || undefined,
  });

  res.status(202).json({
    success: true,
    message: "Message queued for delivery. Check sent history for status updates.",
    data: {
      history,
      jobId: job.id,
    },
  });
});

// -------------------------------------------------------------------------
// Send bulk WhatsApp messages from a CSV/Excel file
// Parses the file, creates history records for each recipient with status
// "queued", and enqueues them all. The worker processes them with
// concurrency limits and rate-limiting.
// -------------------------------------------------------------------------
const sendBulkMessages = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "A CSV or Excel file is required for bulk sending.");
  }

  const parsedFile = await parseContactsFile(req.file);

  if (parsedFile.recipients.length === 0) {
    throw new ApiError(400, "No valid phone numbers were found in the uploaded file.");
  }

  const messageText = req.body.message || "";
  const batchId = new mongoose.Types.ObjectId().toString();

  if (isDirectDispatchMode() && parsedFile.recipients.length > env.directBulkMaxRecipients) {
    throw new ApiError(
      503,
      `Bulk sends on this deployment are limited to ${env.directBulkMaxRecipients} recipients per upload.`,
    );
  }

  const results = [];
  let pendingCount = 0;
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of parsedFile.recipients) {
    const history = await MessageHistory.create({
      owner: req.user._id,
      batchId,
      recipientName: recipient.name,
      phoneNumber: recipient.normalizedPhoneNumber,
      message: messageText || "[Template message]",
      source: "bulk",
      status: "queued",
    });

    if (isDirectDispatchMode()) {
      try {
        const { history: deliveredHistory, delivery } = await deliverMessageImmediately({
          history,
          to: recipient.normalizedPhoneNumber,
          message: messageText || undefined,
        });

        if (deliveredHistory.status === "failed") {
          failedCount += 1;
        } else if (deliveredHistory.status === "sent") {
          sentCount += 1;
        } else if (deliveredHistory.status === "pending") {
          pendingCount += 1;
        }

        results.push({
          rowNumber: recipient.rowNumber,
          recipientName: recipient.name,
          phoneNumber: recipient.normalizedPhoneNumber,
          status: deliveredHistory.status,
          historyId: deliveredHistory._id,
          messageId: delivery.messageId,
          error: deliveredHistory.status === "failed" ? deliveredHistory.errorMessage : undefined,
        });
      } catch (error) {
        failedCount += 1;
        results.push({
          rowNumber: recipient.rowNumber,
          recipientName: recipient.name,
          phoneNumber: recipient.normalizedPhoneNumber,
          status: "failed",
          historyId: history._id,
          error: error.message,
        });
      }

      continue;
    }

    const job = await enqueueMessage({
      historyId: history._id.toString(),
      to: recipient.normalizedPhoneNumber,
      message: messageText || undefined,
    });

    results.push({
      rowNumber: recipient.rowNumber,
      recipientName: recipient.name,
      phoneNumber: recipient.normalizedPhoneNumber,
      status: "queued",
      historyId: history._id,
      jobId: job.id,
    });
  }

  res.status(202).json({
    success: true,
    message: isDirectDispatchMode()
      ? buildDirectBulkResponseMessage({ sentCount, pendingCount, failedCount })
      : `${results.length} messages queued for delivery. Check sent history for status updates.`,
    data: {
      batchId,
      totalRows: parsedFile.totalRows,
      validRecipients: parsedFile.recipients.length,
      invalidRows: parsedFile.invalidRows,
      duplicateRows: parsedFile.duplicateRows,
      queuedCount: isDirectDispatchMode() ? 0 : results.length,
      pendingCount,
      sentCount,
      failedCount,
      resultsPreview: results.slice(0, 50),
    },
  });
});

// -------------------------------------------------------------------------
// Parse a bulk file without sending — returns the recipient list and a
// batchId so the frontend can drive the sequential send flow.
// -------------------------------------------------------------------------
const parseBulkFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "A CSV or Excel file is required.");
  }

  const parsedFile = await parseContactsFile(req.file);

  if (parsedFile.recipients.length === 0) {
    throw new ApiError(400, "No valid phone numbers were found in the uploaded file.");
  }

  const batchId = new mongoose.Types.ObjectId().toString();

  res.status(200).json({
    success: true,
    message: `${parsedFile.recipients.length} valid recipients found.`,
    data: {
      batchId,
      totalRows: parsedFile.totalRows,
      validRecipients: parsedFile.recipients.length,
      invalidRows: parsedFile.invalidRows,
      duplicateRows: parsedFile.duplicateRows,
      recipients: parsedFile.recipients,
    },
  });
});

// -------------------------------------------------------------------------
// Send a single WhatsApp message as part of a bulk batch.
// Creates a history record with the supplied batchId so it is grouped
// with the rest of the batch, then delivers immediately.
// -------------------------------------------------------------------------
const sendBulkSingle = asyncHandler(async (req, res) => {
  const { phoneNumber, name, message, batchId } = req.body;

  if (!batchId) {
    throw new ApiError(400, "batchId is required for bulk-single sends.");
  }

  const messageText = message || "";

  const history = await MessageHistory.create({
    owner: req.user._id,
    batchId,
    recipientName: name || "",
    phoneNumber,
    message: messageText || "[Template message]",
    source: "bulk",
    status: "queued",
  });

  if (isDirectDispatchMode()) {
    try {
      const result = await deliverMessageImmediately({
        history,
        to: phoneNumber,
        message: messageText || undefined,
        skipProviderSync: true,
      });

      res.status(200).json({
        success: true,
        message:
          result.history.status === "sent"
            ? "Message sent successfully."
            : getDeliverySuccessMessage(result.delivery),
        data: {
          historyId: result.history._id,
          status: result.history.status,
          messageId: result.delivery.messageId,
        },
      });
      return;
    } catch (error) {
      res.status(200).json({
        success: false,
        message: error.message || "Message delivery failed.",
        data: {
          historyId: history._id,
          status: "failed",
          error: error.message,
        },
      });
      return;
    }
  }

  // Queue mode fallback
  const job = await enqueueMessage({
    historyId: history._id.toString(),
    to: phoneNumber,
    message: messageText || undefined,
  });

  res.status(202).json({
    success: true,
    message: "Message queued for delivery.",
    data: {
      historyId: history._id,
      status: "queued",
      jobId: job.id,
    },
  });
});

// -------------------------------------------------------------------------
// Get message history (paginated, with cursor support)
// -------------------------------------------------------------------------
const getMessageHistory = asyncHandler(async (req, res) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const filter = {};

  if (req.query.cursor) {
    filter._id = { $lt: req.query.cursor };
  }

  const skip = req.query.cursor ? 0 : (page - 1) * limit;

  if (req.user.role === "super_admin" && req.query.ownerId) {
    filter.owner = req.query.ownerId;
  } else if (req.user.role === "admin") {
    filter.owner = req.user._id;
  }

  try {
    await syncRecentProviderStatuses({
      ownerId: filter.owner || null,
    });
  } catch (syncError) {
    console.warn(`Recent provider sync skipped: ${syncError.message}`);
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.source) {
    filter.source = req.query.source;
  }

  if (req.query.batchId) {
    filter.batchId = req.query.batchId;
  }

  if (req.query.search) {
    filter.$or = [
      { recipientName: { $regex: req.query.search, $options: "i" } },
      { phoneNumber: { $regex: req.query.search, $options: "i" } },
      { message: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [history, total] = await Promise.all([
    MessageHistory.find(filter)
      .populate("owner", "name email role crmAccessId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    MessageHistory.countDocuments(filter),
  ]);

  const nextCursor = history.length === limit ? history[history.length - 1]._id : null;

  res.status(200).json({
    success: true,
    message: "Message history fetched successfully.",
    data: {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        nextCursor,
      },
    },
  });
});

const getMessageHistoryById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.historyId };

  if (req.user.role === "admin") {
    filter.owner = req.user._id;
  }

  const history = await MessageHistory.findOne(filter)
    .populate("owner", "name email role crmAccessId");

  if (!history) {
    throw new ApiError(404, "Message history entry not found.");
  }

  try {
    await syncHistoryDocumentsWithProvider([history]);
  } catch (syncError) {
    console.warn(`Provider sync skipped for history ${history._id}: ${syncError.message}`);
  }

  res.status(200).json({
    success: true,
    message: "Message history item fetched successfully.",
    data: {
      history,
    },
  });
});

const clearQueuedMessages = asyncHandler(async (req, res) => {
  const filter = { status: "queued" };

  if (req.user.role === "admin") {
    filter.owner = req.user._id;
  }

  const queuedMessages = await MessageHistory.find(filter).select("_id");

  if (queuedMessages.length === 0) {
    res.status(200).json({
      success: true,
      message: "No queued messages were found.",
      data: {
        matchedCount: 0,
        clearedCount: 0,
        skippedActiveCount: 0,
      },
    });
    return;
  }

  const removableIds = [];
  let skippedActiveCount = 0;

  if (env.messageDispatchMode === "queue") {
    const queue = getWhatsappQueue();

    for (const entry of queuedMessages) {
      const job = await queue.getJob(`msg-${entry._id}`);

      if (!job) {
        removableIds.push(entry._id);
        continue;
      }

      const state = await job.getState();
      if (state === "active") {
        skippedActiveCount += 1;
        continue;
      }

      try {
        await job.remove();
        removableIds.push(entry._id);
      } catch (_error) {
        skippedActiveCount += 1;
      }
    }
  } else {
    removableIds.push(...queuedMessages.map((entry) => entry._id));
  }

  if (removableIds.length > 0) {
    await MessageHistory.updateMany(
      { _id: { $in: removableIds } },
      {
        $set: {
          status: "failed",
          errorMessage: "Cleared manually before delivery.",
          sentAt: null,
        },
      },
    );
  }

  res.status(200).json({
    success: true,
    message:
      removableIds.length > 0
        ? `${removableIds.length} queued messages cleared successfully.`
        : "Queued messages are currently being processed and could not be cleared.",
    data: {
      matchedCount: queuedMessages.length,
      clearedCount: removableIds.length,
      skippedActiveCount,
    },
  });
});

const verifyDeliveryWebhook = asyncHandler(async (req, res) => {
  const mode = String(req.query["hub.mode"] || "").trim();
  const token = String(req.query["hub.verify_token"] || "").trim();
  const challenge = String(req.query["hub.challenge"] || "").trim();

  if (!challenge) {
    throw new ApiError(400, "Webhook challenge is missing.");
  }

  if (mode && mode !== "subscribe") {
    throw new ApiError(400, "Unsupported webhook verification mode.");
  }

  if (env.whatsappWebhookVerifyToken && token !== env.whatsappWebhookVerifyToken) {
    throw new ApiError(403, "Webhook verification token is invalid.");
  }

  res.status(200).send(challenge);
});

// -------------------------------------------------------------------------
// Webhook for Fast2SMS / Meta Delivery status updates
// Receives async status updates so "sent" can transition to "delivered" or "failed"
// -------------------------------------------------------------------------
const handleDeliveryWebhook = asyncHandler(async (req, res) => {
  const payload = req.body;
  const statuses = extractWebhookStatuses(payload);

  try {
    for (const status of statuses) {
      const messageId = extractWebhookMessageId(status);
      if (!messageId) {
        continue;
      }

      const history = await MessageHistory.findOne({ metaMessageId: messageId });
      if (!history) {
        continue;
      }

      if (applyWebhookStatusToHistory({ history, status })) {
        await history.save();
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  // Always respond with 200 OK so Meta/Fast2SMS knows we received it
  res.status(200).send("EVENT_RECEIVED");
});

module.exports = {
  clearQueuedMessages,
  getMessageHistory,
  getMessageHistoryById,
  parseBulkFile,
  sendBulkSingle,
  verifyDeliveryWebhook,
  sendBulkMessages,
  sendSingleMessage,
  handleDeliveryWebhook,
};
