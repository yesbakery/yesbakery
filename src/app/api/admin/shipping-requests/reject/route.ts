import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getShippingRequestById, rejectShippingRequest } from "../../../../../lib/shipping-requests";

type RejectPayload = {
  requestId?: string;
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

  let payload: RejectPayload;

  try {
    payload = (await request.json()) as RejectPayload;
  } catch {
    return badRequest("Invalid rejection request.");
  }

  const requestId = clean(payload.requestId);

  if (!requestId) {
    return badRequest("Missing shipping request id.");
  }

  const existingRecord = await getShippingRequestById(requestId);

  if (!existingRecord) {
    return badRequest("Shipping request not found.", 404);
  }

  const rejectedRecord = await rejectShippingRequest(requestId);

  if (!rejectedRecord) {
    return badRequest("Shipping request could not be rejected.", 500);
  }

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: existingRecord.email,
      subject: "Update on your Yes Bakery shipping request",
      html: `
        <h2>Hello ${existingRecord.fullName},</h2>
        <p>Thank you for your shipping arrangement request.</p>
        <p>At this time, we are not able to approve shipping for the requested order.</p>
        <p>You are always welcome to place a pickup order in Union City, California, or contact us for other options.</p>
        <p><strong>Requested items:</strong> ${existingRecord.orderSummary}</p>
      `,
    });

    return NextResponse.json({ ok: true, request: rejectedRecord });
  } catch {
    return badRequest("Shipping rejection email could not be sent.", 500);
  }
}
