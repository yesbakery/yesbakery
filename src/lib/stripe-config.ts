import Stripe from "stripe";

export const STRIPE_PRICE_ENV_KEYS = {
  sourdough: "STRIPE_PRICE_SOURDOUGH",
  "sourdough-blueberries-brown-sugar": "STRIPE_PRICE_SOURDOUGH",
  "sourdough-cheddar-jalapeno": "STRIPE_PRICE_SOURDOUGH",
  "sourdough-cherry-sugar": "STRIPE_PRICE_SOURDOUGH",
  "sourdough-cinnamon-sugar": "STRIPE_PRICE_SOURDOUGH",
  "sourdough-multigrain": "STRIPE_PRICE_SOURDOUGH",
  "quesadilla-salvadorena": "STRIPE_PRICE_QUESADILLA_SALVADORENA",
  "cinnamon-rolls": "STRIPE_PRICE_CINNAMON_ROLLS",
  empanada: "STRIPE_PRICE_EMPANADA",
  "tropical-paradise-jam": "STRIPE_PRICE_TROPICAL_PARADISE_JAM",
} as const;

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

export function getStripePriceId(productId: string) {
  const envKey = STRIPE_PRICE_ENV_KEYS[productId as keyof typeof STRIPE_PRICE_ENV_KEYS];

  return envKey ? process.env[envKey]?.trim() || "" : "";
}

export function getStripeServerClient() {
  const stripeSecretKey = getStripeSecretKey();

  if (!stripeSecretKey) {
    return null;
  }

  return new Stripe(stripeSecretKey);
}
