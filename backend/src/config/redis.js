const IORedis = require("ioredis");
const env = require("./env");

/**
 * Shared Redis connection options used by both BullMQ Queue and Worker.
 * BullMQ requires ioredis, NOT the generic `redis` package.
 */
const redisOptions = {
    host: env.redisHost,
    port: env.redisPort,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
};

/**
 * Create a fresh ioredis connection (BullMQ needs separate connections
 * for Queue and Worker).
 */
function createRedisConnection() {
    return new IORedis(redisOptions);
}

module.exports = {
    redisOptions,
    createRedisConnection,
};
