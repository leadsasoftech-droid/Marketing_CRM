const cors = require("cors");
const express = require("express");
const helmet = require("helmet");

const env = require("./config/env");
const { ensureRuntimeReady } = require("./bootstrap/runtime");
const { apiLimiter, authLimiter } = require("./middlewares/rateLimit.middleware");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");
const sanitizeRequest = require("./middlewares/sanitize.middleware");
const routes = require("./routes");

const app = express();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesOriginPattern(origin, pattern) {
  if (pattern === "*") {
    return true;
  }

  if (!pattern.includes("*")) {
    return pattern === origin;
  }

  const regexPattern = `^${pattern.split("*").map(escapeRegex).join(".*")}$`;
  return new RegExp(regexPattern, "i").test(origin);
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (env.corsOrigins.some((pattern) => matchesOriginPattern(origin, pattern))) {
    return true;
  }

  if (env.corsAllowVercelOrigins && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.disable("x-powered-by");
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: env.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));
app.use(sanitizeRequest);
app.use(ensureRuntimeReady);
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

// Health check – useful for monitoring which cluster worker handles a request
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: new Date().toISOString(),
  });
});

app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
