const mongoose = require("mongoose");

const env = require("../config/env");
const MessageHistory = require("../models/messageHistory.model");
const { parseContactsFile } = require("../services/bulkUpload.service");
const { enqueueMessage } = require("../queues/whatsapp.queue");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

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

  const results = [];

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
    message: `${results.length} messages queued for delivery. Check sent history for status updates.`,
    data: {
      batchId,
      totalRows: parsedFile.totalRows,
      validRecipients: parsedFile.recipients.length,
      invalidRows: parsedFile.invalidRows,
      duplicateRows: parsedFile.duplicateRows,
      queuedCount: results.length,
      resultsPreview: results.slice(0, 50),
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

  res.status(200).json({
    success: true,
    message: "Message history item fetched successfully.",
    data: {
      history,
    },
  });
});

// -------------------------------------------------------------------------
// Webhook for Fast2SMS / Meta Delivery status updates
// Receives async status updates so "sent" can transition to "delivered" or "failed"
// -------------------------------------------------------------------------
const handleDeliveryWebhook = asyncHandler(async (req, res) => {
  // Fast2SMS/Meta sends status updates here
  const payload = req.body;

  try {
    // Basic Meta Webhook Payload Format Structure Handling
    // Expected structure has entry -> changes -> value -> statuses -> [status objects]
    if (payload.entry && payload.entry.length > 0) {
      for (const entry of payload.entry) {
        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            if (change.value && change.value.statuses) {
              for (const status of change.value.statuses) {
                const messageId = status.id;
                const messageStatus = status.status; // e.g., 'delivered', 'read', 'failed'

                // Find the history entry by metaMessageId
                const history = await MessageHistory.findOne({ metaMessageId: messageId });
                if (history) {
                  // Only update to failed if the webhook says it failed.
                  // We don't overwrite queued. We can update sent to delivered or failed.
                  if (messageStatus === "failed") {
                    history.status = "failed";
                    history.errorMessage = "Delivery failed through Meta API. Message rejected or undeliverable.";
                    if (status.errors) {
                      history.metaResponse = status;
                    }
                  } else if (messageStatus === "delivered" && history.status === "sent") {
                    // Update from 'sent' to 'delivered' if we have such a status, or just keep 'sent'.
                    // For now, if we want to stick to the 'sent' state, we do nothing. Un-comment if you use 'delivered' status.
                    // history.status = "delivered";
                  }
                  await history.save();
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  // Always respond with 200 OK so Meta/Fast2SMS knows we received it
  res.status(200).send("EVENT_RECEIVED");
});

module.exports = {
  getMessageHistory,
  getMessageHistoryById,
  sendBulkMessages,
  sendSingleMessage,
  handleDeliveryWebhook,
};
