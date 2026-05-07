import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { listUnifiedOrders } from "../../../../lib/order-processing";

export async function GET(request: NextRequest) {
  const requestedScope = request.nextUrl.searchParams.get("scope");
  const scope = requestedScope === "archived" || requestedScope === "all" ? requestedScope : "active";
  const orders = await listUnifiedOrders({ scope });
  return NextResponse.json({ orders });
}
