import Stripe from "stripe";
import { SOURDOUGH_ID } from "./catalog";

export const STRIPE_PRICE_ENV_KEYS = {
  [SOURDOUGH_ID]: "STRIPE_PRICE_SOURDOUGH",
  "quesadilla-salvadorena": "STRIPE_PRICE_QUESADILLA_SALVADORENA",
  "cinnamon-rolls": "STRIPE_PRICE_CINNAMON_ROLLS",
  empanada: "STRIPE_PRICE_EMPANADA",
  "tropical-paradise-jam": "STRIPE_PRICE_TROPICAL_PARADISE_JAM",
} as const;

export const STRIPE_INCLUSION_PRICE_ENV_KEY = "STRIPE_PRICE_SOURDOUGH_INCLUSION";

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

export function getStripeSourdoughInclusionPriceId() {
  return process.env[STRIPE_INCLUSION_PRICE_ENV_KEY]?.trim() || "";
}

export function getStripeServerClient() {
  const stripeSecretKey = getStripeSecretKey();

  if (!stripeSecretKey) {
    return null;
  }

  return new Stripe(stripeSecretKey);
}
