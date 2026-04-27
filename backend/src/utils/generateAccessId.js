const crypto = require("crypto");

function generateAccessId(prefix = "CRM") {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

module.exports = generateAccessId;
