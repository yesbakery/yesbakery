import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredShippingCartItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedInclusions: Array<{
    id: string;
    name: string;
  }>;
};

export type ShippingRequestRecord = {
  id: string;
  status: "pending" | "approved";
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  shippingRequest: string;
  notes: string;
  orderSummary: string;
  cart: StoredShippingCartItem[];
  createdAt: string;
  approvalCode: string | null;
  approvalUrl: string | null;
  approvedAt: string | null;
};

const dataDirectory = path.join(process.cwd(), "data");
const shippingRequestsFilePath = path.join(dataDirectory, "shipping-requests.json");

async function readShippingRequests() {
  try {
    const contents = await readFile(shippingRequestsFilePath, "utf8");
    return JSON.parse(contents) as ShippingRequestRecord[];
  } catch {
    return [];
  }
}

async function writeShippingRequests(records: ShippingRequestRecord[]) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(shippingRequestsFilePath, JSON.stringify(records, null, 2));
}

export async function listShippingRequests() {
  return readShippingRequests();
}

export async function getShippingRequestById(requestId: string) {
  const existingRequests = await readShippingRequests();
  return existingRequests.find((record) => record.id === requestId) || null;
}

export async function createShippingRequest(
  request: Omit<ShippingRequestRecord, "id" | "status" | "createdAt" | "approvalCode" | "approvalUrl" | "approvedAt">,
) {
  const existingRequests = await readShippingRequests();
  const nextRecord: ShippingRequestRecord = {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    approvalCode: null,
    approvalUrl: null,
    approvedAt: null,
    ...request,
  };

  await writeShippingRequests([nextRecord, ...existingRequests]);
  return nextRecord;
}

export async function approveShippingRequest(
  requestId: string,
  approvalCode: string,
  approvalUrl: string,
) {
  const existingRequests = await readShippingRequests();
  let approvedRecord: ShippingRequestRecord | null = null;

  const updatedRequests = existingRequests.map((record) => {
    if (record.id !== requestId) {
      return record;
    }

    approvedRecord = {
      ...record,
      status: "approved",
      approvalCode,
      approvalUrl,
      approvedAt: new Date().toISOString(),
    };

    return approvedRecord;
  });

  if (!approvedRecord) {
    return null;
  }

  await writeShippingRequests(updatedRequests);
  return approvedRecord;
}

export async function findApprovedShippingRequestByCode(code: string) {
  const existingRequests = await readShippingRequests();
  return existingRequests.find(
    (record) => record.status === "approved" && record.approvalCode === code.trim(),
  );
}
