import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
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
    const customerEmail = session.customer_details?.email || session.customer_email || "";
    const customerName = session.metadata?.customer_name || session.customer_details?.name || "";
    const phone = session.metadata?.phone || session.customer_details?.phone || "";
    const pickupDate = session.metadata?.pickup_date || "";
    const fulfillmentMethod = session.metadata?.fulfillment_method || "pickup";
    const shippingRequest = session.metadata?.shipping_request || "";
    const orderSummary = session.metadata?.order_summary || "";
    const notes = session.metadata?.notes || "";

    const recorded = await recordPaidOrder({
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

    const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
    const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

    if (
      recorded &&
      resendApiKey &&
      resendApiKey !== "re_xxxxxxxxx" &&
      customerEmail &&
      session.payment_status === "paid"
    ) {
      const resend = new Resend(resendApiKey);
      const totalPaid = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (session.currency || "usd").toUpperCase(),
      }).format((session.amount_total || 0) / 100);

      await resend.emails.send({
        from: resendFromEmail,
        to: customerEmail,
        subject: "Your Yes Bakery order is confirmed",
        html: `
          <h2>Thank you for your order${customerName ? `, ${customerName}` : ""}.</h2>
          <p>Your payment has been received and your Yes Bakery order is confirmed.</p>
          <p><strong>Order summary:</strong> ${orderSummary || "Your bakery order has been recorded."}</p>
          <p><strong>Total paid:</strong> ${totalPaid}</p>
          <p><strong>Pickup date:</strong> ${pickupDate || "Not provided"}</p>
          <p><strong>Fulfillment:</strong> ${fulfillmentMethod}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          ${
            fulfillmentMethod === "shipping"
              ? `<p><strong>Shipping request:</strong> ${shippingRequest || "Requested. We will review your arrangement details and follow up by email."}</p>`
              : "<p>Yes Bakery is located in Union City, California. Pickup details will be sent by email.</p>"
          }
          ${notes && notes !== "None" ? `<p><strong>Order notes:</strong> ${notes}</p>` : ""}
          <p>Thank you for supporting Yes Bakery & More.</p>
        `,
      });
    }
  }

  return NextResponse.json({ received: true });
}
