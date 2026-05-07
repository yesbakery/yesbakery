import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseServerClient } from "./supabase-server";

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

type PickupOrderRow = {
  order_id: string;
  full_name: string;
  email: string;
  phone: string;
  pickup_date: string;
  order_summary: string;
  notes: string;
  total_due: number;
  created_at: string;
  status: RecordedPickupOrder["status"] | null;
  status_updated_at: string | null;
  picked_up_at: string | null;
  follow_up_email_sent_at: string | null;
};

function mapRowToRecord(row: PickupOrderRow): RecordedPickupOrder {
  return {
    orderId: row.order_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    pickupDate: row.pickup_date,
    orderSummary: row.order_summary,
    notes: row.notes,
    totalDue: row.total_due,
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
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase.from("pickup_orders").select("*").order("created_at", { ascending: false });

    if (error) {
      throw new Error("Pickup orders could not be loaded from Supabase.");
    }

    return (data as PickupOrderRow[]).map(mapRowToRecord);
  }

  return readPickupOrders();
}

export async function recordPickupOrder(order: RecordedPickupOrder) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("pickup_orders")
      .insert({
        order_id: order.orderId,
        full_name: order.fullName,
        email: order.email,
        phone: order.phone,
        pickup_date: order.pickupDate,
        order_summary: order.orderSummary,
        notes: order.notes,
        total_due: order.totalDue,
        created_at: order.createdAt,
        status: order.status || "new",
        status_updated_at: order.statusUpdatedAt || order.createdAt,
        picked_up_at: order.pickedUpAt || null,
        follow_up_email_sent_at: order.followUpEmailSentAt || null,
      })
      .select("order_id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return false;
      }

      throw new Error("Pickup order could not be saved to Supabase.");
    }

    return Boolean(data);
  }

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
  const supabase = getSupabaseClient();

  if (supabase) {
    const payload: Partial<PickupOrderRow> = {};

    if (typeof updates.fullName === "string") payload.full_name = updates.fullName;
    if (typeof updates.email === "string") payload.email = updates.email;
    if (typeof updates.phone === "string") payload.phone = updates.phone;
    if (typeof updates.pickupDate === "string") payload.pickup_date = updates.pickupDate;
    if (typeof updates.orderSummary === "string") payload.order_summary = updates.orderSummary;
    if (typeof updates.notes === "string") payload.notes = updates.notes;
    if (typeof updates.totalDue === "number") payload.total_due = updates.totalDue;
    if (typeof updates.createdAt === "string") payload.created_at = updates.createdAt;
    if (typeof updates.status === "string") payload.status = updates.status;
    if (typeof updates.statusUpdatedAt === "string") payload.status_updated_at = updates.statusUpdatedAt;
    if (typeof updates.pickedUpAt === "string") payload.picked_up_at = updates.pickedUpAt || null;
    if (typeof updates.followUpEmailSentAt === "string") {
      payload.follow_up_email_sent_at = updates.followUpEmailSentAt || null;
    }

    const { data, error } = await supabase
      .from("pickup_orders")
      .update(payload)
      .eq("order_id", orderId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error("Pickup order could not be updated in Supabase.");
    }

    return data ? mapRowToRecord(data as PickupOrderRow) : null;
  }

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
