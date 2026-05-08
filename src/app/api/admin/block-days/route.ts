import { NextRequest, NextResponse } from "next/server";
import { getStorefrontSettings, updateStorefrontSettings } from "../../../../lib/storefront-settings";

type Payload = {
  blockSaturday?: boolean;
  blockSunday?: boolean;
  blockedDates?: string[];
};

export async function GET() {
  const settings = await getStorefrontSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const settings = await updateStorefrontSettings({
    blockSaturday: Boolean(payload.blockSaturday),
    blockSunday: Boolean(payload.blockSunday),
    blockedDates: Array.isArray(payload.blockedDates) ? payload.blockedDates : [],
  });

  return NextResponse.json({ ok: true, settings });
}
