import { products } from "./catalog";
import { listPaidOrders, RecordedPaidOrder, updatePaidOrder } from "./paid-orders";
import { listPickupOrders, RecordedPickupOrder, updatePickupOrder } from "./pickup-orders";

export type OrderStatus = "new" | "in-progress" | "done" | "picked-up";

export type UnifiedOrder = {
  id: string;
  type: "paid-online" | "pay-at-pickup";
  customerName: string;
  customerEmail: string;
  phone: string;
  pickupDate: string;
  orderSummary: string;
  notes: string;
  amountTotal: number;
  currency: string;
  paymentLabel: string;
  createdAt: string;
  status: OrderStatus;
  statusUpdatedAt: string;
  pickedUpAt: string;
  followUpEmailSentAt: string;
  archivedAt: string;
};

function normalizePaidOrder(order: RecordedPaidOrder): UnifiedOrder {
  return {
    id: order.sessionId,
    type: "paid-online",
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
    status: order.status || "new",
    statusUpdatedAt: order.statusUpdatedAt || order.createdAt,
    pickedUpAt: order.pickedUpAt || "",
    followUpEmailSentAt: order.followUpEmailSentAt || "",
    archivedAt: order.archivedAt || "",
  };
}

function normalizePickupOrder(order: RecordedPickupOrder): UnifiedOrder {
  return {
    id: order.orderId,
    type: "pay-at-pickup",
    customerName: order.fullName,
    customerEmail: order.email,
    phone: order.phone,
    pickupDate: order.pickupDate,
    orderSummary: order.orderSummary,
    notes: order.notes,
    amountTotal: Math.round(order.totalDue * 100),
    currency: "usd",
    paymentLabel: "Pay at pickup",
    createdAt: order.createdAt,
    status: order.status || "new",
    statusUpdatedAt: order.statusUpdatedAt || order.createdAt,
    pickedUpAt: order.pickedUpAt || "",
    followUpEmailSentAt: order.followUpEmailSentAt || "",
    archivedAt: order.archivedAt || "",
  };
}

export async function listUnifiedOrders(options?: { scope?: "active" | "archived" | "all" }) {
  const [paidOrders, pickupOrders] = await Promise.all([listPaidOrders(), listPickupOrders()]);
  const scope = options?.scope || "active";

  const orders = [
    ...paidOrders.map(normalizePaidOrder),
    ...pickupOrders.map(normalizePickupOrder),
  ];

  const filteredOrders = orders.filter((order) => {
    if (scope === "archived") {
      return Boolean(order.archivedAt);
    }

    if (scope === "all") {
      return true;
    }

    return !order.archivedAt;
  });

  return filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getUnifiedOrder(type: UnifiedOrder["type"], id: string, options?: { scope?: "active" | "archived" | "all" }) {
  const orders = await listUnifiedOrders(options);
  return orders.find((order) => order.type === type && order.id === id) || null;
}

export async function updateUnifiedOrder(
  type: UnifiedOrder["type"],
  id: string,
  updates: {
    status?: OrderStatus;
    statusUpdatedAt?: string;
    pickedUpAt?: string;
    followUpEmailSentAt?: string;
    archivedAt?: string;
  },
) {
  if (type === "paid-online") {
    const updated = await updatePaidOrder(id, updates);
    return updated ? normalizePaidOrder(updated) : null;
  }

  const updated = await updatePickupOrder(id, updates);
  return updated ? normalizePickupOrder(updated) : null;
}

export function getSuggestedProducts(orderSummary: string) {
  const loweredSummary = orderSummary.toLowerCase();
  return products
    .filter((product) => !loweredSummary.includes(product.name.toLowerCase()))
    .slice(0, 3);
}
