import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordPaidOrder } from "../../../../lib/paid-orders";
import { sendPaidOrderEmails } from "../../../../lib/paid-order-emails";
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
    const customerEmail = session.customer_details?.email || session.customer_email || "";
    const customerName = session.metadata?.customer_name || session.customer_details?.name || "";
    const phone = session.metadata?.phone || session.customer_details?.phone || "";
    const pickupDate = session.metadata?.pickup_date || "";
    const fulfillmentMethod = session.metadata?.fulfillment_method || "pickup";
    const shippingRequest = session.metadata?.shipping_request || "";
    const orderSummary = session.metadata?.order_summary || "";
    const notes = session.metadata?.notes || "";

    let shouldSendEmails = true;

    try {
      shouldSendEmails = await recordPaidOrder({
        sessionId: session.id,
        amountTotal: session.amount_total || 0,
        currency: session.currency || "usd",
        paymentStatus: session.payment_status || "unknown",
        customerEmail,
        customerName,
        phone,
        pickupDate,
        orderSummary,
        notes,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Stripe webhook could not record paid order before email.", error);
    }

    if (shouldSendEmails && session.payment_status === "paid") {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

      await sendPaidOrderEmails({
        sessionId: session.id,
        customerEmail,
        customerName,
        phone,
        pickupDate,
        fulfillmentMethod,
        shippingRequest,
        notes,
        amountTotal: session.amount_total || 0,
        currency: session.currency || "usd",
        origin: request.nextUrl.origin,
        items: lineItems.data.map((item) => ({
          name: item.description || "Yes Bakery item",
          quantity: item.quantity || 1,
          amount: typeof item.amount_total === "number" ? item.amount_total / 100 : undefined,
        })),
      });
    }
  }

  return NextResponse.json({ received: true });
}
