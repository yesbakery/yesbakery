import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseServerClient } from "./supabase-server";

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

type PaidOrderRow = {
  session_id: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  customer_email: string;
  customer_name: string;
  phone: string;
  pickup_date: string;
  order_summary: string;
  notes: string;
  created_at: string;
  status: RecordedPaidOrder["status"] | null;
  status_updated_at: string | null;
  picked_up_at: string | null;
  follow_up_email_sent_at: string | null;
};

function mapRowToRecord(row: PaidOrderRow): RecordedPaidOrder {
  return {
    sessionId: row.session_id,
    amountTotal: row.amount_total,
    currency: row.currency,
    paymentStatus: row.payment_status,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    phone: row.phone,
    pickupDate: row.pickup_date,
    orderSummary: row.order_summary,
    notes: row.notes,
    createdAt: row.created_at,
    status: row.status || "new",
    statusUpdatedAt: row.status_updated_at || row.created_at,
    pickedUpAt: row.picked_up_at || "",
    followUpEmailSentAt: row.follow_up_email_sent_at || "",
  };
}

function getSupabaseClient() {
  return getSupabaseServerClient();
}

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
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase.from("paid_orders").select("*").order("created_at", { ascending: false });

    if (error) {
      throw new Error("Paid orders could not be loaded from Supabase.");
    }

    return (data as PaidOrderRow[]).map(mapRowToRecord);
  }

  return readPaidOrders();
}

export async function recordPaidOrder(order: RecordedPaidOrder) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("paid_orders")
      .insert({
        session_id: order.sessionId,
        amount_total: order.amountTotal,
        currency: order.currency,
        payment_status: order.paymentStatus,
        customer_email: order.customerEmail,
        customer_name: order.customerName,
        phone: order.phone,
        pickup_date: order.pickupDate,
        order_summary: order.orderSummary,
        notes: order.notes,
        created_at: order.createdAt,
        status: order.status || "new",
        status_updated_at: order.statusUpdatedAt || order.createdAt,
        picked_up_at: order.pickedUpAt || null,
        follow_up_email_sent_at: order.followUpEmailSentAt || null,
      })
      .select("session_id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return false;
      }

      throw new Error("Paid order could not be saved to Supabase.");
    }

    return Boolean(data);
  }

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
  const supabase = getSupabaseClient();

  if (supabase) {
    const payload: Partial<PaidOrderRow> = {};

    if (typeof updates.amountTotal === "number") payload.amount_total = updates.amountTotal;
    if (typeof updates.currency === "string") payload.currency = updates.currency;
    if (typeof updates.paymentStatus === "string") payload.payment_status = updates.paymentStatus;
    if (typeof updates.customerEmail === "string") payload.customer_email = updates.customerEmail;
    if (typeof updates.customerName === "string") payload.customer_name = updates.customerName;
    if (typeof updates.phone === "string") payload.phone = updates.phone;
    if (typeof updates.pickupDate === "string") payload.pickup_date = updates.pickupDate;
    if (typeof updates.orderSummary === "string") payload.order_summary = updates.orderSummary;
    if (typeof updates.notes === "string") payload.notes = updates.notes;
    if (typeof updates.createdAt === "string") payload.created_at = updates.createdAt;
    if (typeof updates.status === "string") payload.status = updates.status;
    if (typeof updates.statusUpdatedAt === "string") payload.status_updated_at = updates.statusUpdatedAt;
    if (typeof updates.pickedUpAt === "string") payload.picked_up_at = updates.pickedUpAt || null;
    if (typeof updates.followUpEmailSentAt === "string") {
      payload.follow_up_email_sent_at = updates.followUpEmailSentAt || null;
    }

    const { data, error } = await supabase
      .from("paid_orders")
      .update(payload)
      .eq("session_id", sessionId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error("Paid order could not be updated in Supabase.");
    }

    return data ? mapRowToRecord(data as PaidOrderRow) : null;
  }

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
