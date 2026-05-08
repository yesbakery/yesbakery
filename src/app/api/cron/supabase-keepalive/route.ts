import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim() || "";
  const authorization = request.headers.get("authorization") || "";

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 500 });
  }

  const [storefrontSettingsResult, pickupOrdersResult, paidOrdersResult] = await Promise.all([
    supabase.from("storefront_settings").select("id").limit(1),
    supabase.from("pickup_orders").select("order_id").limit(1),
    supabase.from("paid_orders").select("session_id").limit(1),
  ]);

  const errors = [
    storefrontSettingsResult.error?.message,
    pickupOrdersResult.error?.message,
    paidOrdersResult.error?.message,
  ].filter(Boolean);

  if (errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        errors,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    touchedAt: new Date().toISOString(),
  });
}
