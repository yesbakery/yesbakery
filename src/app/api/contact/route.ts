import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type ContactPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  message?: string;
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

  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return badRequest("Invalid contact request.");
  }

  const fullName = clean(payload.fullName);
  const email = clean(payload.email);
  const phone = clean(payload.phone);
  const message = clean(payload.message);

  if (!fullName || !email || !message) {
    return badRequest("Please complete your name, email, and message.");
  }

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: "yesbakery@gmail.com",
      subject: `New Yes Bakery contact form message from ${fullName}`,
      replyTo: email,
      html: `
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br />")}</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return badRequest("We couldn't send your message right now. Please try again.", 500);
  }
}
