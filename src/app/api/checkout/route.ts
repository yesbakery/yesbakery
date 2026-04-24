import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { INCLUSION_PRICE, products, sourdoughInclusions, SOURDOUGH_ID } from "../../../lib/catalog";
import {
  getStripePriceId,
  getStripeServerClient,
  getStripeSourdoughInclusionPriceId,
} from "../../../lib/stripe-config";

type CheckoutPayload = {
  cart?: Array<{
    id?: string;
    quantity?: number;
    selectedInclusions?: Array<{ id?: string }>;
  }>;
  checkoutForm?: {
    fullName?: string;
    email?: string;
    phone?: string;
    pickupDate?: string;
    fulfillmentMethod?: string;
    shippingRequest?: string;
    notes?: string;
  };
};

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function requireString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export async function POST(request: NextRequest) {
  const stripe = getStripeServerClient();

  if (!stripe) {
    return badRequest("Stripe is not configured yet. Add STRIPE_SECRET_KEY to the server environment.", 500);
  }

  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return badRequest("Invalid checkout payload.");
  }

  const cart = Array.isArray(payload.cart) ? payload.cart : [];
  const fullName = requireString(payload.checkoutForm?.fullName);
  const email = requireString(payload.checkoutForm?.email);
  const phone = requireString(payload.checkoutForm?.phone);
  const pickupDate = requireString(payload.checkoutForm?.pickupDate);
  const fulfillmentMethod = requireString(payload.checkoutForm?.fulfillmentMethod) || "pickup";
  const shippingRequest = requireString(payload.checkoutForm?.shippingRequest);
  const notes = requireString(payload.checkoutForm?.notes);

  if (!fullName || !email || !phone || !pickupDate) {
    return badRequest("Please complete the checkout form before paying.");
  }

  if (cart.length === 0) {
    return badRequest("Your cart is empty.");
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderSummary: string[] = [];

  for (const rawItem of cart) {
    const productId = requireString(rawItem.id);
    const quantity = Number(rawItem.quantity);
    const product = products.find((entry) => entry.id === productId);

    if (!product || !Number.isInteger(quantity) || quantity <= 0) {
      return badRequest("One or more items in the cart are invalid.");
    }

    const selectedInclusionIds = Array.isArray(rawItem.selectedInclusions)
      ? rawItem.selectedInclusions.map((inclusion) => requireString(inclusion.id)).filter(Boolean)
      : [];

    const uniqueInclusionIds = [...new Set(selectedInclusionIds)];

    if (product.id !== SOURDOUGH_ID && uniqueInclusionIds.length > 0) {
      return badRequest("Only sourdough can include custom inclusions.");
    }

    const matchedInclusions = uniqueInclusionIds.map((inclusionId) =>
      sourdoughInclusions.find((inclusion) => inclusion.id === inclusionId),
    );

    if (matchedInclusions.some((entry) => !entry)) {
      return badRequest("One or more sourdough inclusions are invalid.");
    }

    const inclusionNames = matchedInclusions.map((entry) => entry!.name);
    const stripePriceId = getStripePriceId(product.id);
    const productName =
      inclusionNames.length > 0 ? `${product.name} (${inclusionNames.join(", ")})` : product.name;

    if (stripePriceId) {
      lineItems.push({
        price: stripePriceId,
        quantity,
      });
    } else {
      const unitAmount = product.price * 100;

      lineItems.push({
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: product.name,
            description: shorten(product.description, 200),
          },
        },
      });
    }

    if (product.id === SOURDOUGH_ID && inclusionNames.length > 0) {
      const stripeSourdoughInclusionPriceId = getStripeSourdoughInclusionPriceId();

      if (stripeSourdoughInclusionPriceId) {
        lineItems.push({
          price: stripeSourdoughInclusionPriceId,
          quantity: quantity * inclusionNames.length,
        });
      } else {
        lineItems.push({
          quantity: quantity * inclusionNames.length,
          price_data: {
            currency: "usd",
            unit_amount: INCLUSION_PRICE * 100,
            product_data: {
              name: "Sourdough Inclusion Add-on",
              description: "One sourdough inclusion selection.",
            },
          },
        });
      }
    }

    orderSummary.push(`${quantity}x ${productName}`);
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return badRequest("Missing request origin.", 500);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      customer_email: email,
      billing_address_collection: "auto",
      metadata: {
        customer_name: shorten(fullName, 100),
        phone: shorten(phone, 100),
        pickup_date: shorten(pickupDate, 100),
        fulfillment_method: shorten(fulfillmentMethod, 100),
        shipping_request: shorten(shippingRequest || "None", 500),
        order_summary: shorten(orderSummary.join(" | "), 500),
        notes: shorten(notes || "None", 500),
      },
    });

    if (!session.url) {
      return badRequest("Stripe did not return a checkout URL.", 500);
    }

    return NextResponse.json({ url: session.url });
  } catch {
    return badRequest("Stripe checkout could not be created. Please verify your Stripe keys and try again.", 500);
  }
}
