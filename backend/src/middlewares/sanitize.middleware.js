const sanitizeObject = require("../utils/sanitizeObject");

function replaceContents(target, source) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });

  Object.assign(target, source);
}

function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === "object") {
    replaceContents(req.query, sanitizeObject(req.query));
  }

  next();
}

module.exports = sanitizeRequest;
