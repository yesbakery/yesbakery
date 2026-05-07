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
  status?: "new" | "in-progress" | "done" | "picked-up";
  statusUpdatedAt?: string;
  pickedUpAt?: string;
  followUpEmailSentAt?: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const pickupOrdersFilePath = path.join(dataDirectory, "pickup-orders.json");

async function readPickupOrders() {
  try {
    const contents = await readFile(pickupOrdersFilePath, "utf8");
    return (JSON.parse(contents) as RecordedPickupOrder[]).map((order) => ({
      ...order,
      status: order.status || "new",
      statusUpdatedAt: order.statusUpdatedAt || order.createdAt,
      pickedUpAt: order.pickedUpAt || "",
      followUpEmailSentAt: order.followUpEmailSentAt || "",
    }));
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
  await writeFile(
    pickupOrdersFilePath,
    JSON.stringify(
      [
        {
          ...order,
          status: order.status || "new",
          statusUpdatedAt: order.statusUpdatedAt || order.createdAt,
          pickedUpAt: order.pickedUpAt || "",
          followUpEmailSentAt: order.followUpEmailSentAt || "",
        },
        ...existingOrders,
      ],
      null,
      2,
    ),
  );
  return true;
}

export async function updatePickupOrder(
  orderId: string,
  updates: Partial<RecordedPickupOrder>,
) {
  const existingOrders = await readPickupOrders();
  const orderIndex = existingOrders.findIndex((entry) => entry.orderId === orderId);

  if (orderIndex === -1) {
    return null;
  }

  const updatedOrder = {
    ...existingOrders[orderIndex],
    ...updates,
  };

  existingOrders[orderIndex] = updatedOrder;
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(pickupOrdersFilePath, JSON.stringify(existingOrders, null, 2));

  return updatedOrder;
}
