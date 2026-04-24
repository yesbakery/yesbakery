import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
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
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

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

  if (resendApiKey && resendApiKey !== "re_xxxxxxxxx") {
    const resend = new Resend(resendApiKey);

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
        <p><strong>Requested date:</strong> ${pickupDate}</p>
        <p><strong>Selected items:</strong> ${orderSummary}</p>
        <p><strong>Shipping details:</strong></p>
        <p>${shippingRequest.replace(/\n/g, "<br />")}</p>
        ${notes ? `<p><strong>Order notes:</strong> ${notes.replace(/\n/g, "<br />")}</p>` : ""}
        <p><strong>Request ID:</strong> ${savedRequest.id}</p>
        <p>This request is also available in the backend shipping dashboard for approval or rejection.</p>
      `,
    });
  }

  return NextResponse.json({ ok: true, requestId: savedRequest.id });
}
