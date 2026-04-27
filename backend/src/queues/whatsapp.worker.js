const { Worker } = require("bullmq");
const mongoose = require("mongoose");

const { redisOptions } = require("../config/redis");
const { QUEUE_NAME } = require("../queues/whatsapp.queue");
const { sendTextMessage } = require("../services/whatsapp.service");
const MessageHistory = require("../models/messageHistory.model");

// -------------------------------------------------------------------------
// Status codes that should NOT be retried (permanent failures).
// Everything else (timeouts, 5xx, rate-limits, network errors) is retried.
// -------------------------------------------------------------------------
const PERMANENT_ERROR_CODES = new Set([
    400, // Bad request (invalid number / body)
    401, // Auth error
    403, // Forbidden
    404, // Endpoint not found
]);

// Meta / Fast2SMS error codes that are permanent and should not be retried
const PERMANENT_META_ERROR_CODES = new Set([
    131009, // Parameter value not valid
    132000, // Template not found
    132001, // Template param count mismatch
    132005, // Template not found for language
    132007, // Template format error
    132012, // Template param format mismatch
    132015, // Template paused
    132016, // Template disabled
    100,    // Invalid parameter
]);

/**
 * Decide whether an error is transient (retryable) or permanent.
 * Permanent errors throw `UnrecoverableError` which tells BullMQ
 * to stop retrying immediately.
 */
function isPermanentError(error) {
    // Check HTTP status code
    if (PERMANENT_ERROR_CODES.has(error.statusCode)) {
        return true;
    }

    // Check Meta error code embedded in the response
    const metaCode = error.metaResponse?.error?.code;
    if (metaCode && PERMANENT_META_ERROR_CODES.has(metaCode)) {
        return true;
    }

    return false;
}

/**
 * Process a single WhatsApp send job.
 *
 * On success → updates history to "sent"
 * On permanent failure → updates history to "failed", does NOT retry
 * On transient failure → throws so BullMQ retries with backoff
 */
async function processJob(job) {
    const { historyId, to, message } = job.data;

    // Safety: make sure the history document exists and is still "queued"
    const history = await MessageHistory.findById(historyId);
    if (!history) {
        // Nothing to do — the record was deleted
        return { skipped: true, reason: "History record not found" };
    }

    if (history.status === "sent") {
        // Already sent (perhaps by a previous attempt that succeeded but
        // the job-completion ack was lost). Do NOT send again.
        return { skipped: true, reason: "Already sent" };
    }

    try {
        const delivery = await sendTextMessage({ to, message });

        // ---- Success ----
        history.status = "sent";
        history.metaMessageId = delivery.messageId;
        history.metaResponse = delivery.raw;
        history.sentAt = new Date();

        if (delivery.templateName && !message) {
            history.message = `[Template: ${delivery.templateName}]`;
        }

        await history.save();

        return {
            success: true,
            messageId: delivery.messageId,
            provider: delivery.provider,
        };
    } catch (error) {
        // ---- Permanent failure → stop retrying ----
        if (isPermanentError(error)) {
            history.status = "failed";
            history.errorMessage = error.message;
            history.metaResponse = error.metaResponse || null;
            await history.save();

            // Throwing UnrecoverableError tells BullMQ to NOT retry
            const { UnrecoverableError } = require("bullmq");
            throw new UnrecoverableError(
                `Permanent failure: ${error.message}`
            );
        }

        // ---- Transient failure → let BullMQ retry ----
        // Update the error message but keep status as "queued" so the
        // retry can try again.
        history.errorMessage = `Attempt ${job.attemptsMade + 1}/${job.opts.attempts}: ${error.message}`;
        await history.save();

        throw error; // BullMQ will retry with backoff
    }
}

/**
 * Start the BullMQ worker. Call this once at server startup.
 */
function startWhatsappWorker() {
    const worker = new Worker(QUEUE_NAME, processJob, {
        connection: redisOptions,
        concurrency: 3, // process up to 3 messages in parallel
        limiter: {
            max: 10,      // max 10 jobs
            duration: 60000, // per 60 seconds (rate limit protection)
        },
    });

    worker.on("completed", (job, result) => {
        if (result?.skipped) {
            console.log(
                `[WhatsApp Worker] Job ${job.id} skipped: ${result.reason}`
            );
        } else {
            console.log(
                `[WhatsApp Worker] Job ${job.id} completed — messageId: ${result?.messageId}`
            );
        }
    });

    worker.on("failed", async (job, error) => {
        console.error(
            `[WhatsApp Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}): ${error.message}`
        );

        // If all retries exhausted, mark as failed in DB
        if (job && job.attemptsMade >= job.opts.attempts) {
            try {
                const history = await MessageHistory.findById(job.data.historyId);
                if (history && history.status !== "sent") {
                    history.status = "failed";
                    history.errorMessage = error.message;
                    await history.save();
                }
            } catch (dbError) {
                console.error(
                    `[WhatsApp Worker] Failed to update history for job ${job.id}: ${dbError.message}`
                );
            }
        }
    });

    worker.on("error", (error) => {
        console.error("[WhatsApp Worker] Worker error:", error.message);
    });

    console.log("[WhatsApp Worker] Started and listening for jobs.");
    return worker;
}

module.exports = {
    startWhatsappWorker,
};
