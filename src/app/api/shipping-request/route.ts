import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type ShippingRequestPayload = {
  cart?: Array<{
    name?: string;
    quantity?: number;
    selectedInclusions?: Array<{ name?: string }>;
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
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  if (!resendApiKey || resendApiKey === "re_xxxxxxxxx") {
    return badRequest("Replace re_xxxxxxxxx with your real Resend API key in the server environment.", 500);
  }

  let payload: ShippingRequestPayload;

  try {
    payload = (await request.json()) as ShippingRequestPayload;
  } catch {
    return badRequest("Invalid shipping request.");
  }

  const cart = Array.isArray(payload.cart) ? payload.cart : [];
  const fullName = clean(payload.checkoutForm?.fullName);
  const email = clean(payload.checkoutForm?.email);
  const phone = clean(payload.checkoutForm?.phone);
  const pickupDate = clean(payload.checkoutForm?.pickupDate);
  const shippingRequest = clean(payload.checkoutForm?.shippingRequest);
  const notes = clean(payload.checkoutForm?.notes);

  if (!fullName || !email || !pickupDate || !shippingRequest || cart.length === 0) {
    return badRequest("Please complete the shipping request details before sending.");
  }

  const orderSummary = cart
    .map((item) => {
      const itemName = clean(item.name) || "Item";
      const quantity = Number(item.quantity) || 0;
      const inclusions = Array.isArray(item.selectedInclusions)
        ? item.selectedInclusions.map((inclusion) => clean(inclusion.name)).filter(Boolean)
        : [];
      const inclusionSummary = inclusions.length > 0 ? ` (${inclusions.join(", ")})` : "";

      return `${quantity}x ${itemName}${inclusionSummary}`;
    })
    .join(" | ");

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: "yesbakery@gmail.com",
      subject: `Shipping arrangement request from ${fullName}`,
      replyTo: email,
      html: `
        <h2>New Shipping Arrangement Request</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Requested order date:</strong> ${pickupDate}</p>
        <p><strong>Selected items:</strong> ${orderSummary}</p>
        <p><strong>Shipping details:</strong></p>
        <p>${shippingRequest.replace(/\n/g, "<br />")}</p>
        ${notes ? `<p><strong>Order notes:</strong> ${notes.replace(/\n/g, "<br />")}</p>` : ""}
        <p>If approved, send the customer a shipping approval code so they can return to checkout.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return badRequest("We couldn't send your shipping request right now. Please try again.", 500);
  }
}
