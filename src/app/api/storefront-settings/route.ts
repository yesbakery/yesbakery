import { NextResponse } from "next/server";
import { getStorefrontSettings } from "../../../lib/storefront-settings";

export async function GET() {
  const settings = await getStorefrontSettings();
  return NextResponse.json({ settings });
}
