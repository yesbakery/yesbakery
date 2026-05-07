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
  status?: "new" | "in-progress" | "done" | "picked-up";
  statusUpdatedAt?: string;
  pickedUpAt?: string;
  followUpEmailSentAt?: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const paidOrdersFilePath = path.join(dataDirectory, "paid-orders.json");

async function readPaidOrders() {
  try {
    const contents = await readFile(paidOrdersFilePath, "utf8");
    return (JSON.parse(contents) as RecordedPaidOrder[]).map((order) => ({
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

export async function listPaidOrders() {
  return readPaidOrders();
}

export async function recordPaidOrder(order: RecordedPaidOrder) {
  const existingOrders = await readPaidOrders();

  if (existingOrders.some((entry) => entry.sessionId === order.sessionId)) {
    return false;
  }

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(
    paidOrdersFilePath,
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

export async function updatePaidOrder(
  sessionId: string,
  updates: Partial<RecordedPaidOrder>,
) {
  const existingOrders = await readPaidOrders();
  const orderIndex = existingOrders.findIndex((entry) => entry.sessionId === sessionId);

  if (orderIndex === -1) {
    return null;
  }

  const updatedOrder = {
    ...existingOrders[orderIndex],
    ...updates,
  };

  existingOrders[orderIndex] = updatedOrder;
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(paidOrdersFilePath, JSON.stringify(existingOrders, null, 2));

  return updatedOrder;
}
