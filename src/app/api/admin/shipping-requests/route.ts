import { NextResponse } from "next/server";
import { listShippingRequests } from "../../../../lib/shipping-requests";

export async function GET() {
  const requests = await listShippingRequests();
  return NextResponse.json({
    requests: requests.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  });
}
