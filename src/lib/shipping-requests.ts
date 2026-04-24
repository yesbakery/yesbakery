import { getSupabaseServerClient } from "./supabase-server";

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
  status: "pending" | "approved" | "rejected";
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
  rejectedAt: string | null;
};

type ShippingRequestRow = {
  id: string;
  status: ShippingRequestRecord["status"];
  full_name: string;
  email: string;
  phone: string;
  pickup_date: string;
  shipping_request: string;
  notes: string;
  order_summary: string;
  cart: ShippingRequestRecord["cart"];
  created_at: string;
  approval_code: string | null;
  approval_url: string | null;
  approved_at: string | null;
  rejected_at: string | null;
};

function mapRowToRecord(row: ShippingRequestRow): ShippingRequestRecord {
  return {
    id: row.id,
    status: row.status,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    pickupDate: row.pickup_date,
    shippingRequest: row.shipping_request,
    notes: row.notes,
    orderSummary: row.order_summary,
    cart: Array.isArray(row.cart) ? row.cart : [],
    createdAt: row.created_at,
    approvalCode: row.approval_code,
    approvalUrl: row.approval_url,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
  };
}

function getClientOrThrow() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return supabase;
}

export async function listShippingRequests() {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase.from("shipping_requests").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error("Shipping requests could not be loaded from Supabase.");
  }

  return (data as ShippingRequestRow[]).map(mapRowToRecord);
}

export async function getShippingRequestById(requestId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("shipping_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error("Shipping request could not be loaded from Supabase.");
  }

  return data ? mapRowToRecord(data as ShippingRequestRow) : null;
}

export async function createShippingRequest(
  request: Omit<
    ShippingRequestRecord,
    "id" | "status" | "createdAt" | "approvalCode" | "approvalUrl" | "approvedAt" | "rejectedAt"
  >,
) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("shipping_requests")
    .insert({
      status: "pending",
      full_name: request.fullName,
      email: request.email,
      phone: request.phone,
      pickup_date: request.pickupDate,
      shipping_request: request.shippingRequest,
      notes: request.notes,
      order_summary: request.orderSummary,
      cart: request.cart,
      approval_code: null,
      approval_url: null,
      approved_at: null,
      rejected_at: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Shipping request could not be saved to Supabase.");
  }

  return mapRowToRecord(data as ShippingRequestRow);
}

export async function approveShippingRequest(requestId: string, approvalCode: string, approvalUrl: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("shipping_requests")
    .update({
      status: "approved",
      approval_code: approvalCode,
      approval_url: approvalUrl,
      approved_at: new Date().toISOString(),
      rejected_at: null,
    })
    .eq("id", requestId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error("Shipping request could not be approved.");
  }

  return data ? mapRowToRecord(data as ShippingRequestRow) : null;
}

export async function rejectShippingRequest(requestId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("shipping_requests")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      approval_code: null,
      approval_url: null,
      approved_at: null,
    })
    .eq("id", requestId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error("Shipping request could not be rejected.");
  }

  return data ? mapRowToRecord(data as ShippingRequestRow) : null;
}

export async function findApprovedShippingRequestByCode(code: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("shipping_requests")
    .select("*")
    .eq("status", "approved")
    .eq("approval_code", code.trim())
    .maybeSingle();

  if (error) {
    throw new Error("Shipping approval code could not be checked.");
  }

  return data ? mapRowToRecord(data as ShippingRequestRow) : null;
}
