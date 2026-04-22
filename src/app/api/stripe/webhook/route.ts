import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordPaidOrder } from "../../../../lib/paid-orders";
import { getStripeSecretKey, getStripeWebhookSecret } from "../../../../lib/stripe-config";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = getStripeSecretKey();
  const webhookSecret = getStripeWebhookSecret();

  if (!stripeSecretKey || !webhookSecret) {
    return jsonError("Stripe webhook is not configured yet.", 500);
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError("Missing Stripe signature header.");
  }

  const body = await request.text();
  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return jsonError("Stripe webhook signature verification failed.", 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    await recordPaidOrder({
      sessionId: session.id,
      amountTotal: session.amount_total || 0,
      currency: session.currency || "usd",
      paymentStatus: session.payment_status || "unknown",
      customerEmail: session.customer_details?.email || session.customer_email || "",
      customerName: session.metadata?.customer_name || session.customer_details?.name || "",
      phone: session.metadata?.phone || session.customer_details?.phone || "",
      pickupDate: session.metadata?.pickup_date || "",
      orderSummary: session.metadata?.order_summary || "",
      notes: session.metadata?.notes || "",
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ received: true });
}
