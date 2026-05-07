import { NextRequest, NextResponse } from "next/server";
import { getUnifiedOrder, updateUnifiedOrder, UnifiedOrder } from "../../../../../lib/order-processing";

type Payload = {
  id?: string;
  type?: UnifiedOrder["type"];
  archived?: boolean;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = clean(payload.id);
  const type = payload.type;
  const archived = Boolean(payload.archived);

  if (!id || (type !== "paid-online" && type !== "pay-at-pickup")) {
    return NextResponse.json({ error: "Order information is missing." }, { status: 400 });
  }

  const existingOrder = await getUnifiedOrder(type, id, { scope: "all" });

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const updatedOrder = await updateUnifiedOrder(type, id, {
    archivedAt: archived ? new Date().toISOString() : "",
  });

  if (!updatedOrder) {
    return NextResponse.json({ error: "Order could not be archived." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order: updatedOrder });
}
