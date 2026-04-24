import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getDashboardPassword } from "../../../../lib/admin-auth";

export async function POST(request: NextRequest) {
  const dashboardPassword = getDashboardPassword();

  if (!dashboardPassword) {
    return NextResponse.json({ error: "BACKEND_DASHBOARD_PASSWORD is not configured." }, { status: 500 });
  }

  let payload: { password?: string };

  try {
    payload = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }

  if ((payload.password || "").trim() !== dashboardPassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
