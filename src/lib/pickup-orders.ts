import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RecordedPickupOrder = {
  orderId: string;
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  orderSummary: string;
  notes: string;
  totalDue: number;
  createdAt: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const pickupOrdersFilePath = path.join(dataDirectory, "pickup-orders.json");

async function readPickupOrders() {
  try {
    const contents = await readFile(pickupOrdersFilePath, "utf8");
    return JSON.parse(contents) as RecordedPickupOrder[];
  } catch {
    return [];
  }
}

export async function listPickupOrders() {
  return readPickupOrders();
}

export async function recordPickupOrder(order: RecordedPickupOrder) {
  const existingOrders = await readPickupOrders();

  if (existingOrders.some((entry) => entry.orderId === order.orderId)) {
    return false;
  }

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(pickupOrdersFilePath, JSON.stringify([order, ...existingOrders], null, 2));
  return true;
}
