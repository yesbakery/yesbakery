import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, ".env.local");

function readEnvFile() {
  if (!fs.existsSync(envLocalPath)) {
    return "";
  }

  return fs.readFileSync(envLocalPath, "utf8");
}

function readStripeSecretKey(envContents) {
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY.trim();
  }

  const match = envContents.match(/^STRIPE_SECRET_KEY=(.+)$/m);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

function upsertEnvValue(envContents, key, value) {
  const nextLine = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(envContents)) {
    return envContents.replace(pattern, nextLine);
  }

  return `${envContents.trimEnd()}\n${nextLine}\n`;
}

const catalog = [
  {
    envKey: "STRIPE_PRICE_SOURDOUGH",
    productId: "sourdough",
    name: "Sourdough",
    description: "Yes Bakery & More classic sourdough loaf.",
    amount: 1000,
  },
  {
    envKey: "STRIPE_PRICE_QUESADILLA_SALVADORENA",
    productId: "quesadilla-salvadorena",
    name: "Quesadilla Salvadorena",
    description: "Yes Bakery & More Salvadoran quesadilla cake.",
    amount: 2500,
  },
  {
    envKey: "STRIPE_PRICE_CINNAMON_ROLLS",
    productId: "cinnamon-rolls",
    name: "Cinnamon Rolls",
    description: "Yes Bakery & More cinnamon rolls.",
    amount: 600,
  },
  {
    envKey: "STRIPE_PRICE_EMPANADA",
    productId: "empanada",
    name: "Empanada",
    description: "Yes Bakery & More empanada.",
    amount: 300,
  },
  {
    envKey: "STRIPE_PRICE_TROPICAL_PARADISE_JAM",
    productId: "tropical-paradise-jam",
    name: "Tropical Paradise Jam",
    description: "Yes Bakery & More tropical paradise jam, 4 ounces.",
    amount: 500,
  },
  {
    envKey: "STRIPE_PRICE_SOURDOUGH_INCLUSION",
    productId: "sourdough-inclusion",
    name: "Sourdough Inclusion Add-on",
    description: "One sourdough inclusion selection.",
    amount: 200,
  },
];

const envContents = readEnvFile();
const stripeSecretKey = readStripeSecretKey(envContents);

if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY. Add it to .env.local first.");
  process.exit(1);
}

if (!stripeSecretKey.startsWith("sk_test_")) {
  console.error("Use a Stripe test secret key for sandbox product creation.");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

async function createCatalogEntry(entry) {
  const product = await stripe.products.create({
    name: entry.name,
    description: entry.description,
    metadata: {
      local_product_id: entry.productId,
      environment: "sandbox",
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: entry.amount,
    metadata: {
      local_product_id: entry.productId,
      environment: "sandbox",
    },
  });

  return {
    ...entry,
    stripeProductId: product.id,
    stripePriceId: price.id,
  };
}

async function main() {
  const createdEntries = [];

  for (const entry of catalog) {
    const created = await createCatalogEntry(entry);
    createdEntries.push(created);
  }

  let nextEnvContents = envContents;

  for (const entry of createdEntries) {
    nextEnvContents = upsertEnvValue(nextEnvContents, entry.envKey, entry.stripePriceId);
  }

  fs.writeFileSync(envLocalPath, nextEnvContents);

  console.log("Stripe sandbox catalog created:");

  for (const entry of createdEntries) {
    console.log(`${entry.name}`);
    console.log(`  Product ID: ${entry.stripeProductId}`);
    console.log(`  Price ID: ${entry.stripePriceId}`);
    console.log(`  Amount: $${(entry.amount / 100).toFixed(2)}`);
  }

  console.log("\n.env.local updated with Stripe price IDs.");
}

main().catch((error) => {
  console.error("Stripe sandbox setup failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
