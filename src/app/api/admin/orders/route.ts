import { NextResponse } from "next/server";
import { listUnifiedOrders } from "../../../../lib/order-processing";

export async function GET() {
  const orders = await listUnifiedOrders();
  return NextResponse.json({ orders });
}
