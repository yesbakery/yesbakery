import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { approveShippingRequest, getShippingRequestById } from "../../../../../lib/shipping-requests";

type ApprovePayload = {
  requestId?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function generateApprovalCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function POST(request: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  if (!resendApiKey || resendApiKey === "re_xxxxxxxxx") {
    return badRequest("Replace re_xxxxxxxxx with your real Resend API key in the server environment.", 500);
  }

  let payload: ApprovePayload;

  try {
    payload = (await request.json()) as ApprovePayload;
  } catch {
    return badRequest("Invalid approval request.");
  }

  const requestId = clean(payload.requestId);

  if (!requestId) {
    return badRequest("Missing shipping request id.");
  }

  const approvalCode = generateApprovalCode();
  const origin = request.headers.get("origin");

  if (!origin) {
    return badRequest("Missing request origin.", 500);
  }

  const existingRecord = await getShippingRequestById(requestId);

  if (!existingRecord) {
    return badRequest("Shipping request not found.", 404);
  }

  const serializedCart = Buffer.from(
    JSON.stringify({
      cart: existingRecord.cart,
      checkoutForm: {
        fullName: existingRecord.fullName,
        email: existingRecord.email,
        phone: existingRecord.phone,
        pickupDate: existingRecord.pickupDate,
        fulfillmentMethod: "shipping",
        shippingRequest: existingRecord.shippingRequest,
        shippingApprovalCode: approvalCode,
        notes: existingRecord.notes,
      },
    }),
    "utf8",
  ).toString("base64url");

  const approvalUrl = `${origin}/?checkout=${serializedCart}&shippingRequest=${existingRecord.id}&shippingCode=${approvalCode}#checkout`;
  const approvedRecord = await approveShippingRequest(requestId, approvalCode, approvalUrl);

  if (!approvedRecord) {
    return badRequest("Shipping request could not be approved.", 500);
  }

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: existingRecord.email,
      subject: "Your Yes Bakery shipping request has been approved",
      html: `
        <h2>Hello ${existingRecord.fullName},</h2>
        <p>Your shipping arrangement request has been approved.</p>
        <p><strong>Your shipping approval code:</strong> ${approvalCode}</p>
        <p>Use the link below to return to your cart with all selected items already loaded:</p>
        <p><a href="${approvalUrl}">${approvalUrl}</a></p>
        <p>You will need your approval code to continue through checkout.</p>
        <p><strong>Selected items:</strong> ${existingRecord.orderSummary}</p>
      `,
    });

    return NextResponse.json({
      ok: true,
      request: approvedRecord,
    });
  } catch {
    return badRequest("Shipping approval email could not be sent.", 500);
  }
}
