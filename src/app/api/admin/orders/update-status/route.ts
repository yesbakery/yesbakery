import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  getSuggestedProducts,
  getUnifiedOrder,
  OrderStatus,
  updateUnifiedOrder,
  UnifiedOrder,
} from "../../../../../lib/order-processing";

type Payload = {
  id?: string;
  type?: UnifiedOrder["type"];
  status?: OrderStatus;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatStatusLabel(status: OrderStatus) {
  switch (status) {
    case "in-progress":
      return "In Progress";
    case "done":
      return "Done";
    case "picked-up":
      return "Picked Up";
    default:
      return "New";
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
}

async function sendPickedUpEmail(request: NextRequest, order: UnifiedOrder) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  if (!resendApiKey || resendApiKey === "re_xxxxxxxxx" || !order.customerEmail) {
    return;
  }

  const baseUrl = getBaseUrl(request);
  const logoUrl = baseUrl ? `${baseUrl}/assets/new_logo.PNG` : "";
  const suggestions = getSuggestedProducts(order.orderSummary);
  const resend = new Resend(resendApiKey);

  await resend.emails.send({
    from: resendFromEmail,
    to: order.customerEmail,
    subject: "Thank you for picking up your Yes Bakery order",
    html: `
      <div style="font-family: Georgia, serif; background: #fbf3ef; padding: 32px; color: #4f2c1a;">
        <div style="max-width: 640px; margin: 0 auto; background: #fffaf7; border-radius: 24px; padding: 28px; border: 1px solid rgba(107, 68, 45, 0.12);">
          ${
            logoUrl
              ? `<div style="text-align:center; margin-bottom: 20px;"><img src="${logoUrl}" alt="Yes Bakery & More logo" style="width: 220px; max-width: 100%; height: auto;" /></div>`
              : ""
          }
          <h2 style="font-size: 32px; margin: 0 0 14px; color: #5f311c;">Thank you${order.customerName ? `, ${order.customerName}` : ""}.</h2>
          <p style="line-height: 1.7; color: #6f5143; margin-bottom: 16px;">
            We loved preparing your order, and we hope everything brought a little extra warmth to your table.
          </p>
          <p style="line-height: 1.7; color: #6f5143; margin-bottom: 16px;">
            <strong style="color:#5f311c;">Order:</strong> ${order.orderSummary}<br />
            <strong style="color:#5f311c;">Total:</strong> ${formatMoney(order.amountTotal, order.currency)}<br />
            <strong style="color:#5f311c;">Pickup date:</strong> ${order.pickupDate || "Not provided"}
          </p>
          ${
            suggestions.length > 0
              ? `
                <div style="margin-top: 24px; padding: 18px; border-radius: 18px; background: #f8eee7;">
                  <p style="margin: 0 0 10px; font-weight: 700; color: #5f311c;">For your next order, you might enjoy:</p>
                  <ul style="margin: 0; padding-left: 20px; color: #6f5143; line-height: 1.7;">
                    ${suggestions
                      .map((product) => `<li><strong style="color:#5f311c;">${product.name}</strong> — ${product.description}</li>`)
                      .join("")}
                  </ul>
                </div>
              `
              : ""
          }
          <p style="line-height: 1.7; color: #6f5143; margin-top: 24px;">
            If you ever have a question about a future order, reply to this email or contact us and we will be happy to help.
          </p>
        </div>
      </div>
    `,
  });
}

export async function POST(request: NextRequest) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = clean(payload.id);
  const type = payload.type;
  const status = payload.status;

  if (!id || (type !== "paid-online" && type !== "pay-at-pickup")) {
    return NextResponse.json({ error: "Order information is missing." }, { status: 400 });
  }

  if (!status || !["new", "in-progress", "done", "picked-up"].includes(status)) {
    return NextResponse.json({ error: "A valid status is required." }, { status: 400 });
  }

  const existingOrder = await getUnifiedOrder(type, id);

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updatedOrder = await updateUnifiedOrder(type, id, {
    status,
    statusUpdatedAt: now,
    pickedUpAt: status === "picked-up" ? now : existingOrder.pickedUpAt,
  });

  if (!updatedOrder) {
    return NextResponse.json({ error: "Order could not be updated." }, { status: 500 });
  }

  let followUpEmailSent = false;

  if (status === "picked-up" && !existingOrder.followUpEmailSentAt) {
    await sendPickedUpEmail(request, updatedOrder);
    await updateUnifiedOrder(type, id, {
      followUpEmailSentAt: now,
    });
    followUpEmailSent = true;
  }

  return NextResponse.json({
    ok: true,
    order: {
      ...updatedOrder,
      followUpEmailSentAt: followUpEmailSent ? now : updatedOrder.followUpEmailSentAt,
    },
    statusLabel: formatStatusLabel(status),
  });
}
