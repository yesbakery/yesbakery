import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Usage: node scripts/import-recovered-pickup-orders.mjs /path/to/emails.csv");
  process.exit(1);
}

const projectRoot = process.cwd();
const dataDirectory = path.join(projectRoot, "data");
const pickupOrdersFilePath = path.join(dataDirectory, "pickup-orders.json");

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function parseCsv(contents) {
  const lines = contents
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function createRecoveredOrder(row) {
  const subjectMatch = row.subject.match(/^New pickup order\s+(YP-[A-Z0-9]+)\s+from\s+(.+)$/i);

  if (!subjectMatch) {
    return null;
  }

  const [, orderId, rawName] = subjectMatch;
  const customerEmail = row.reply_to || row.to || "";

  return {
    orderId,
    fullName: toTitleCase(rawName.trim()),
    email: customerEmail.trim(),
    phone: "",
    pickupDate: "Unknown (recovered from email log)",
    orderSummary: "Recovered from email log export. Full item details were not available in the CSV.",
    notes: "Recovered from email log export. Order items, pickup date, phone number, and total were not included in the export.",
    totalDue: 0,
    createdAt: row.created_at,
    status: "new",
    statusUpdatedAt: row.created_at,
    pickedUpAt: "",
    followUpEmailSentAt: "",
  };
}

async function readExistingPickupOrders() {
  try {
    const contents = await readFile(pickupOrdersFilePath, "utf8");
    return JSON.parse(contents);
  } catch {
    return [];
  }
}

const csvContents = await readFile(csvPath, "utf8");
const rows = parseCsv(csvContents);
const recoveredOrders = rows
  .filter((row) => row.subject.toLowerCase().startsWith("new pickup order "))
  .map(createRecoveredOrder)
  .filter(Boolean);

const existingOrders = await readExistingPickupOrders();
const existingOrderIds = new Set(existingOrders.map((order) => order.orderId));
const newOrders = recoveredOrders.filter((order) => !existingOrderIds.has(order.orderId));

await mkdir(dataDirectory, { recursive: true });
await writeFile(
  pickupOrdersFilePath,
  JSON.stringify(
    [...newOrders, ...existingOrders].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    null,
    2,
  ),
);

console.log(`Recovered ${newOrders.length} pickup orders from ${csvPath}`);
for (const order of newOrders) {
  console.log(`- ${order.orderId}: ${order.fullName} <${order.email || "no-email"}>`);
}
