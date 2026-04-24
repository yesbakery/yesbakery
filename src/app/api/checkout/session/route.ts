import { NextRequest, NextResponse } from "next/server";
import { getStripeServerClient } from "../../../../lib/stripe-config";

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const stripe = getStripeServerClient();

  if (!stripe) {
    return badRequest("Stripe is not configured yet.", 500);
  }

  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() || "";

  if (!sessionId) {
    return badRequest("Missing session_id.");
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    });

    return NextResponse.json({
      sessionId: session.id,
      customerEmail: session.customer_details?.email || session.customer_email || "",
      customerName: session.metadata?.customer_name || session.customer_details?.name || "",
      phone: session.metadata?.phone || session.customer_details?.phone || "",
      pickupDate: session.metadata?.pickup_date || "",
      fulfillmentMethod: session.metadata?.fulfillment_method || "",
      shippingRequest: session.metadata?.shipping_request || "",
      notes: session.metadata?.notes || "",
      orderSummary: session.metadata?.order_summary || "",
      paymentStatus: session.payment_status || "",
      amountTotal: session.amount_total || 0,
      currency: session.currency || "usd",
      lineItems: lineItems.data.map((item) => ({
        description: item.description || item.price?.nickname || "Item",
        quantity: item.quantity || 0,
        amountTotal: item.amount_total || 0,
        currency: item.currency || session.currency || "usd",
      })),
    });
  } catch {
    return badRequest("Stripe session details could not be loaded.", 500);
  }
}
