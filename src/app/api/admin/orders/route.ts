import { NextResponse } from "next/server";
import { listPaidOrders } from "../../../../lib/paid-orders";
import { listPickupOrders } from "../../../../lib/pickup-orders";

export async function GET() {
  const [paidOrders, pickupOrders] = await Promise.all([listPaidOrders(), listPickupOrders()]);

  const orders = [
    ...paidOrders.map((order) => ({
      id: order.sessionId,
      type: "paid-online" as const,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      phone: order.phone,
      pickupDate: order.pickupDate,
      orderSummary: order.orderSummary,
      notes: order.notes,
      amountTotal: order.amountTotal,
      currency: order.currency,
      paymentLabel: "Paid online",
      createdAt: order.createdAt,
    })),
    ...pickupOrders.map((order) => ({
      id: order.orderId,
      type: "pay-at-pickup" as const,
      customerName: order.fullName,
      customerEmail: order.email,
      phone: order.phone,
      pickupDate: order.pickupDate,
      orderSummary: order.orderSummary,
      notes: order.notes,
      amountTotal: order.totalDue,
      currency: "usd",
      paymentLabel: "Pay at pickup",
      createdAt: order.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ orders });
}
