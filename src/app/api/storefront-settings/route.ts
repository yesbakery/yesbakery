import { NextResponse } from "next/server";
import { defaultPickupScheduleSettings } from "../../../lib/pickup-scheduling";
import { getStorefrontSettings } from "../../../lib/storefront-settings";

export async function GET() {
  try {
    const settings = await getStorefrontSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Storefront settings route fell back to defaults.", error);
    return NextResponse.json({ settings: defaultPickupScheduleSettings });
  }
}
