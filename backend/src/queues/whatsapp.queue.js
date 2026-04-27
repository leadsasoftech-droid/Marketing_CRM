const { Queue } = require("bullmq");
const { redisOptions } = require("../config/redis");

// -------------------------------------------------------------------------
// WhatsApp Message Queue
//
// Every message (single or bulk) is enqueued here. The worker picks it up,
// calls the Fast2SMS API, and updates the MessageHistory document.
//
// Default retry policy:
//   - 3 attempts total (1 initial + 2 retries)
//   - Exponential backoff: 10 s → 20 s
//   - Only TRANSIENT errors trigger retries (timeouts, 5xx, rate-limits)
//   - Permanent errors (invalid number, bad template, auth) fail immediately
// -------------------------------------------------------------------------

const QUEUE_NAME = "whatsapp-send";

const whatsappQueue = new Queue(QUEUE_NAME, {
    connection: redisOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 10000, // 10 s base delay
        },
        removeOnComplete: {
            age: 86400, // keep completed jobs for 24 h
            count: 500,
        },
        removeOnFail: {
            age: 604800, // keep failed jobs for 7 days
        },
    },
});

/**
 * Add a single WhatsApp message job to the queue.
 *
 * @param {{ historyId: string, to: string, message?: string }} data
 * @returns {Promise<import("bullmq").Job>}
 */
async function enqueueMessage(data) {
    return whatsappQueue.add("send-message", data, {
        // Deduplicate by historyId — prevents the same message from being
        // queued twice (e.g. on accidental double-click that gets past
        // the frontend ref guard).
        jobId: `msg-${data.historyId}`,
    });
}

module.exports = {
    QUEUE_NAME,
    whatsappQueue,
    enqueueMessage,
};
