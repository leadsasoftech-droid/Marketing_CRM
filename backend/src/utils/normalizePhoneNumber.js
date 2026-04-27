const env = require("../config/env");

function normalizePhoneNumber(input, fallbackCountryCode = env.defaultCountryCode) {
  if (input === null || input === undefined) {
    return "";
  }

  let phoneNumber = String(input).trim();

  if (!phoneNumber) {
    return "";
  }

  if (phoneNumber.startsWith("+")) {
    phoneNumber = phoneNumber.slice(1);
  }

  phoneNumber = phoneNumber.replace(/\D/g, "");

  if (phoneNumber.startsWith("00")) {
    phoneNumber = phoneNumber.slice(2);
  }

  if (phoneNumber.length === 10 && fallbackCountryCode) {
    phoneNumber = `${fallbackCountryCode}${phoneNumber}`;
  }

  return phoneNumber;
}

module.exports = normalizePhoneNumber;
