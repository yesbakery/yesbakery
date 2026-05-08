import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getMinimumQuantityForProduct, products } from "../../../lib/catalog";
import { renderOrderItemsEmail } from "../../../lib/email-order-items";
import { defaultPickupScheduleSettings } from "../../../lib/pickup-scheduling";
import { isPickupDateValid } from "../../../lib/pickup-scheduling";
import { recordPickupOrder } from "../../../lib/pickup-orders";
import { getStorefrontSettings } from "../../../lib/storefront-settings";

type PickupOrderPayload = {
  cart?: Array<{
    id?: string;
    quantity?: number;
  }>;
  checkoutForm?: {
    fullName?: string;
    email?: string;
    phone?: string;
    pickupDate?: string;
    fulfillmentMethod?: string;
    paymentMethod?: string;
    pickupApprovalCode?: string;
    notes?: string;
  };
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function buildOrderId() {
  const stamp = Date.now().toString(36).toUpperCase();
  return `YP-${stamp.slice(-8)}`;
}

export async function POST(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
    const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

    if (!resendApiKey || resendApiKey === "re_xxxxxxxxx") {
      return badRequest("Resend is not configured yet. Add your real Resend API key to the server environment.", 500);
    }

    let payload: PickupOrderPayload;

    try {
      payload = (await request.json()) as PickupOrderPayload;
    } catch {
      return badRequest("Invalid pickup order request.");
    }

    const rawCart = Array.isArray(payload.cart) ? payload.cart : [];
    const fullName = clean(payload.checkoutForm?.fullName);
    const email = clean(payload.checkoutForm?.email);
    const phone = clean(payload.checkoutForm?.phone);
    const pickupDate = clean(payload.checkoutForm?.pickupDate);
    const fulfillmentMethod = clean(payload.checkoutForm?.fulfillmentMethod) || "pickup";
    const paymentMethod = clean(payload.checkoutForm?.paymentMethod) || "stripe";
    const pickupApprovalCode = clean(payload.checkoutForm?.pickupApprovalCode).toUpperCase();
    const notes = clean(payload.checkoutForm?.notes);

    if (!fullName || !email || !phone || !pickupDate || rawCart.length === 0) {
      return badRequest("Please complete the pickup order details before submitting.");
    }

    if (fulfillmentMethod !== "pickup" || paymentMethod !== "pickup") {
      return badRequest("This route only accepts pickup orders that will be paid at pickup.");
    }

    let storefrontSettings = defaultPickupScheduleSettings;
    try {
      storefrontSettings = await getStorefrontSettings();
    } catch (error) {
      console.error("Pickup order fell back to default storefront settings.", error);
    }

    if (!isPickupDateValid(pickupDate, "pickup", storefrontSettings)) {
      return badRequest("This pickup date is not currently available.");
    }

    if (!pickupApprovalCode || !pickupApprovalCode.startsWith("YB-")) {
      return badRequest("A valid pickup code starting with YB- is required before this order can be placed.");
    }

  const cart = rawCart
    .map((item) => {
      const productId = clean(item.id);
      const quantity = Number(item.quantity) || 0;
      const product = products.find((entry) => entry.id === productId);
      const minimumQuantity = getMinimumQuantityForProduct(productId);

      if (!product || quantity <= 0 || quantity < minimumQuantity) {
        return null;
      }

      return {
        product,
        quantity,
        lineTotal: product.price * quantity,
      };
    })
    .filter(Boolean) as Array<{
    product: (typeof products)[number];
    quantity: number;
    lineTotal: number;
  }>;

  if (cart.length === 0) {
    return badRequest("Your cart is empty or has items below their required minimum quantity.");
  }

  const orderSummary = cart.map((item) => `${item.quantity}x ${item.product.name}`).join(" | ");
  const totalDue = cart.reduce((total, item) => total + item.lineTotal, 0);
  const orderId = buildOrderId();
  const resend = new Resend(resendApiKey);
  const origin = request.nextUrl.origin;
  const itemListMarkup = renderOrderItemsEmail(
    cart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      amount: item.lineTotal,
    })),
    origin,
  );

  try {
    const recorded = await recordPickupOrder({
      orderId,
      fullName,
      email,
      phone,
      pickupDate,
      orderSummary,
      notes,
      totalDue,
      createdAt: new Date().toISOString(),
    });

    if (!recorded) {
      return badRequest("This pickup order was already recorded.", 409);
    }
  } catch (recordError) {
    console.error("Pickup order could not be recorded in storage.", recordError);
    return badRequest("We couldn't save your pickup order right now. Please try again.", 500);
  }

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: "yesbakery@gmail.com",
      replyTo: email,
      subject: `New pickup order ${orderId} from ${fullName}`,
      html: `
        <h2>New Pickup Order</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Pickup date:</strong> ${pickupDate}</p>
        <p><strong>Payment:</strong> Pay at pickup</p>
        <p><strong>Pickup code:</strong> ${pickupApprovalCode}</p>
        <p><strong>Items:</strong></p>
        ${itemListMarkup}
        <p><strong>Total due at pickup:</strong> ${formatAmount(totalDue)}</p>
        ${notes ? `<p><strong>Order notes:</strong> ${notes.replace(/\n/g, "<br />")}</p>` : ""}
      `,
    });

    await resend.emails.send({
      from: resendFromEmail,
      to: email,
      replyTo: "yesbakery@gmail.com",
      subject: `Your Yes Bakery pickup order ${orderId}`,
      html: `
        <h2>Thank you, ${fullName}.</h2>
        <p>Your order has been placed and reserved for pickup.</p>
        <div style="margin: 22px auto; max-width: 460px; padding: 20px; border-radius: 20px; background: #fbf1ea; border: 1px solid rgba(166, 84, 45, 0.16); text-align: center;">
          <p style="margin: 0 0 8px; color: #8f583c; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700;">
            Pick Up Date
          </p>
          <p style="margin: 0; color: #b43d2a; font-size: 32px; line-height: 1.2; font-weight: 800;">
            ${pickupDate}
          </p>
          <p style="margin: 14px 0 0; color: #6f5143; line-height: 1.7;">
            This is not a delivery order, you will have to pick this order up at Union City, CA. Details will be provided once your order is completed.
          </p>
        </div>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Pickup date:</strong> ${pickupDate}</p>
        <p><strong>Payment:</strong> Pay at pickup</p>
        <p><strong>Pickup code:</strong> ${pickupApprovalCode}</p>
        <p><strong>Items:</strong></p>
        ${itemListMarkup}
        <p><strong>Total due at pickup:</strong> ${formatAmount(totalDue)}</p>
        ${notes ? `<p><strong>Order notes:</strong> ${notes.replace(/\n/g, "<br />")}</p>` : ""}
      `,
    });
  } catch (emailError) {
    console.error("Pickup order was saved, but email delivery failed.", emailError);
  }

    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    console.error("Pickup order route failed unexpectedly.", error);
    return badRequest("We couldn't place your pickup order right now. Please try again.", 500);
  }
}
