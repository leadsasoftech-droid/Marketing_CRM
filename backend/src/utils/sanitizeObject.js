function sanitizeObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeObject(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((accumulator, [key, entry]) => {
    if (key.startsWith("$") || key.includes(".")) {
      return accumulator;
    }

    accumulator[key] = sanitizeObject(entry);
    return accumulator;
  }, {});
}

module.exports = sanitizeObject;
