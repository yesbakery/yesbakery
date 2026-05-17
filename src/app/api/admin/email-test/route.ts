import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "";

  if (!resendApiKey || resendApiKey === "re_xxxxxxxxx") {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
  }

  if (!resendFromEmail) {
    return NextResponse.json({ error: "RESEND_FROM_EMAIL is not configured." }, { status: 500 });
  }

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: resendFromEmail,
      to: "yesbakery@gmail.com",
      replyTo: "yesbakery@gmail.com",
      subject: "YesBakery email test",
      html: `
        <h2>YesBakery Email Test</h2>
        <p>This confirms the live app can send email through Resend.</p>
        <p>Sent at ${new Date().toISOString()}.</p>
      `,
    });

    return NextResponse.json({ ok: true, id: result.data?.id || "" });
  } catch (error) {
    console.error("Admin email test failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email test failed." },
      { status: 500 },
    );
  }
}
