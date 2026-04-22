import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RecordedPaidOrder = {
  sessionId: string;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
  customerEmail: string;
  customerName: string;
  phone: string;
  pickupDate: string;
  orderSummary: string;
  notes: string;
  createdAt: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const paidOrdersFilePath = path.join(dataDirectory, "paid-orders.json");

async function readPaidOrders() {
  try {
    const contents = await readFile(paidOrdersFilePath, "utf8");
    return JSON.parse(contents) as RecordedPaidOrder[];
  } catch {
    return [];
  }
}

export async function recordPaidOrder(order: RecordedPaidOrder) {
  const existingOrders = await readPaidOrders();

  if (existingOrders.some((entry) => entry.sessionId === order.sessionId)) {
    return;
  }

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(paidOrdersFilePath, JSON.stringify([order, ...existingOrders], null, 2));
}
