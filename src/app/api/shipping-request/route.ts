import { NextRequest, NextResponse } from "next/server";
import { createShippingRequest } from "../../../lib/shipping-requests";

type ShippingRequestPayload = {
  cart?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
    selectedInclusions?: Array<{ id?: string; name?: string }>;
  }>;
  checkoutForm?: {
    fullName?: string;
    email?: string;
    phone?: string;
    pickupDate?: string;
    shippingRequest?: string;
    notes?: string;
  };
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let payload: ShippingRequestPayload;

  try {
    payload = (await request.json()) as ShippingRequestPayload;
  } catch {
    return badRequest("Invalid shipping request.");
  }

  const rawCart = Array.isArray(payload.cart) ? payload.cart : [];
  const fullName = clean(payload.checkoutForm?.fullName);
  const email = clean(payload.checkoutForm?.email);
  const phone = clean(payload.checkoutForm?.phone);
  const pickupDate = clean(payload.checkoutForm?.pickupDate);
  const shippingRequest = clean(payload.checkoutForm?.shippingRequest);
  const notes = clean(payload.checkoutForm?.notes);

  if (!fullName || !email || !pickupDate || !shippingRequest || rawCart.length === 0) {
    return badRequest("Please complete the shipping request details before sending.");
  }

  const cart = rawCart.map((item) => ({
    id: clean(item.id),
    name: clean(item.name) || "Item",
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    selectedInclusions: Array.isArray(item.selectedInclusions)
      ? item.selectedInclusions.map((inclusion) => ({
          id: clean(inclusion.id),
          name: clean(inclusion.name),
        }))
      : [],
  }));

  const orderSummary = cart
    .map((item) => {
      const inclusions =
        item.selectedInclusions.length > 0
          ? ` (${item.selectedInclusions.map((inclusion) => inclusion.name).join(", ")})`
          : "";

      return `${item.quantity}x ${item.name}${inclusions}`;
    })
    .join(" | ");

  const savedRequest = await createShippingRequest({
    fullName,
    email,
    phone,
    pickupDate,
    shippingRequest,
    notes,
    orderSummary,
    cart,
  });

  return NextResponse.json({ ok: true, requestId: savedRequest.id });
}
