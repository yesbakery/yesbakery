import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import { renderOrderItemsEmail } from "../../../../lib/email-order-items";
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

    await recordPaidOrder({
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

    if (resendApiKey && resendApiKey !== "re_xxxxxxxxx" && session.payment_status === "paid") {
      const resend = new Resend(resendApiKey);
      const origin = request.nextUrl.origin;
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      const totalPaid = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (session.currency || "usd").toUpperCase(),
      }).format((session.amount_total || 0) / 100);
      const itemListMarkup = renderOrderItemsEmail(
        lineItems.data.map((item) => ({
          name: item.description || "Yes Bakery item",
          quantity: item.quantity || 1,
          amount: typeof item.amount_total === "number" ? item.amount_total / 100 : undefined,
        })),
        origin,
      );
      const shippingRequestMarkup =
        fulfillmentMethod === "shipping-code" || fulfillmentMethod === "shipping-request"
          ? `<p><strong>Shipping request:</strong> ${shippingRequest || "Requested. Please review the arrangement details."}</p>`
          : "";
      const notesMarkup = notes && notes !== "None" ? `<p><strong>Order notes:</strong> ${notes}</p>` : "";
      const orderDetailsMarkup = `
        <p><strong>Order summary:</strong></p>
        ${itemListMarkup}
        <p><strong>Total paid:</strong> ${totalPaid}</p>
        <p><strong>Pickup date:</strong> ${pickupDate || "Not provided"}</p>
        <p><strong>Fulfillment:</strong> ${fulfillmentMethod}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Stripe session:</strong> ${session.id}</p>
        ${shippingRequestMarkup}
        ${notesMarkup}
      `;

      await resend.emails.send({
        from: resendFromEmail,
        to: "yesbakery@gmail.com",
        replyTo: customerEmail || "yesbakery@gmail.com",
        subject: `New paid order from ${customerName || customerEmail || "Yes Bakery customer"}`,
        html: `
          <h2>New Paid Order</h2>
          <p><strong>Name:</strong> ${customerName || "Not provided"}</p>
          <p><strong>Email:</strong> ${customerEmail || "Not provided"}</p>
          ${orderDetailsMarkup}
        `,
      });

      if (customerEmail) {
        await resend.emails.send({
          from: resendFromEmail,
          to: customerEmail,
          replyTo: "yesbakery@gmail.com",
          subject: "Your Yes Bakery order is confirmed",
          html: `
          <h2>Thank you for your order${customerName ? `, ${customerName}` : ""}.</h2>
          <p>Your payment has been received and your Yes Bakery order is confirmed.</p>
          ${
            fulfillmentMethod === "pickup"
              ? `
                <div style="margin: 22px auto; max-width: 460px; padding: 20px; border-radius: 20px; background: #fbf1ea; border: 1px solid rgba(166, 84, 45, 0.16); text-align: center;">
                  <p style="margin: 0 0 8px; color: #8f583c; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700;">
                    Pick Up Date
                  </p>
                  <p style="margin: 0; color: #b43d2a; font-size: 32px; line-height: 1.2; font-weight: 800;">
                    ${pickupDate || "Not provided"}
                  </p>
                  <p style="margin: 14px 0 0; color: #6f5143; line-height: 1.7;">
                    This is not a delivery order, you will have to pick this order up at Union City, CA. Details will be provided once your order is completed.
                  </p>
                </div>
              `
              : ""
          }
          ${orderDetailsMarkup}
          <p>Thank you for supporting Yes Bakery & More.</p>
        `,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
