const path = require("path");
const { Readable } = require("stream");

const csvParser = require("csv-parser");
const XLSX = require("xlsx");

const normalizePhoneNumber = require("../utils/normalizePhoneNumber");

const PHONE_KEYS = [
  "phone",
  "phonenumber",
  "number",
  "mobile",
  "mobilenumber",
  "whatsapp",
  "whatsappnumber",
  "contact",
  "contactnumber",
];

const NAME_KEYS = ["name", "fullname", "customername", "clientname"];
const COUNTRY_KEYS = ["countrycode", "code", "dialcode"];

function detectFileType(filename = "") {
  const extension = path.extname(filename).toLowerCase();

  if (extension === ".csv") {
    return "csv";
  }

  return "excel";
}

function normalizeRow(row = {}) {
  return Object.entries(row).reduce((accumulator, [key, value]) => {
    const normalizedKey = String(key)
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "");

    accumulator[normalizedKey] = value;
    return accumulator;
  }, {});
}

function getFirstValue(row, keys, fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return fallback;
}

function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];

    Readable.from(buffer)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    defval: "",
  });
}

async function parseContactsFile(file) {
  const fileType = detectFileType(file.originalname);
  const rows =
    fileType === "csv" ? await parseCsv(file.buffer) : parseExcel(file.buffer);

  const recipients = [];
  const invalidRows = [];
  const duplicateRows = [];
  const seen = new Set();

  rows.forEach((row, index) => {
    const normalizedRow = normalizeRow(row);
    const rowNumber = index + 2;
    const rawPhoneNumber = getFirstValue(normalizedRow, PHONE_KEYS);
    const countryCode = getFirstValue(normalizedRow, COUNTRY_KEYS).replace(/\D/g, "");
    const normalizedPhone = normalizePhoneNumber(rawPhoneNumber, countryCode);

    if (!normalizedPhone) {
      invalidRows.push({
        rowNumber,
        reason: "Phone number is missing or invalid.",
      });
      return;
    }

    if (seen.has(normalizedPhone)) {
      duplicateRows.push({
        rowNumber,
        phoneNumber: normalizedPhone,
      });
      return;
    }

    seen.add(normalizedPhone);

    recipients.push({
      rowNumber,
      name: getFirstValue(normalizedRow, NAME_KEYS),
      phoneNumber: rawPhoneNumber,
      normalizedPhoneNumber: normalizedPhone,
      countryCode,
    });
  });

  return {
    fileType,
    totalRows: rows.length,
    recipients,
    invalidRows,
    duplicateRows,
  };
}

module.exports = {
  parseContactsFile,
};
