const connectDatabase = require("../config/database");
const ensureDefaultSuperAdmin = require("../services/bootstrap.service");

let runtimeReadyPromise = null;

function initializeRuntime() {
  if (!runtimeReadyPromise) {
    runtimeReadyPromise = (async () => {
      await connectDatabase();
      await ensureDefaultSuperAdmin();
    })().catch((error) => {
      runtimeReadyPromise = null;
      throw error;
    });
  }

  return runtimeReadyPromise;
}

async function ensureRuntimeReady(_req, _res, next) {
  try {
    await initializeRuntime();
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  ensureRuntimeReady,
  initializeRuntime,
};
