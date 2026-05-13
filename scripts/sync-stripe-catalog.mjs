import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, ".env.local");

const catalog = [
  {
    envKey: "STRIPE_PRICE_SOURDOUGH",
    productId: "sourdough",
    name: "Sourdough",
    description: "Yes Bakery & More classic sourdough loaf.",
    amount: 1000,
  },
  {
    envKey: "STRIPE_PRICE_SOURDOUGH_CINNAMON_SUGAR",
    productId: "sourdough-cinnamon-sugar",
    name: "Sourdough with Cinnamon & Sugar",
    description: "Yes Bakery & More sourdough loaf with cinnamon and sugar.",
    amount: 1200,
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
    description: "Yes Bakery & More empanada filled with cajeta Mexican caramel.",
    amount: 300,
  },
  {
    envKey: "STRIPE_PRICE_GLUTEN_FREE_CHOCOLATE_CHIP_COOKIES",
    productId: "gluten-free-chocolate-chip-cookies",
    name: "Gluten-Free Chocolate Chip Cookies",
    description: "Yes Bakery & More gluten-free chocolate chip cookies.",
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

  const prefix = envContents.trimEnd();
  return prefix ? `${prefix}\n${nextLine}\n` : `${nextLine}\n`;
}

function getModeFromKey(secretKey) {
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  throw new Error("STRIPE_SECRET_KEY must start with sk_live_ or sk_test_.");
}

async function findExistingProduct(stripe, localProductId, mode) {
  let startingAfter = undefined;

  while (true) {
    const page = await stripe.products.list({
      limit: 100,
      active: true,
      starting_after: startingAfter,
    });

    const match = page.data.find(
      (product) =>
        product.metadata?.local_product_id === localProductId &&
        product.metadata?.environment === mode,
    );

    if (match) {
      return match;
    }

    if (!page.has_more || page.data.length === 0) {
      return null;
    }

    startingAfter = page.data[page.data.length - 1].id;
  }
}

async function findExistingPrice(stripe, productId, unitAmount, mode) {
  let startingAfter = undefined;

  while (true) {
    const page = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
      starting_after: startingAfter,
    });

    const match = page.data.find(
      (price) =>
        price.currency === "usd" &&
        price.unit_amount === unitAmount &&
        price.metadata?.environment === mode,
    );

    if (match) {
      return match;
    }

    if (!page.has_more || page.data.length === 0) {
      return null;
    }

    startingAfter = page.data[page.data.length - 1].id;
  }
}

async function ensureCatalogEntry(stripe, entry, mode) {
  let product = await findExistingProduct(stripe, entry.productId, mode);

  if (!product) {
    product = await stripe.products.create({
      name: entry.name,
      description: entry.description,
      metadata: {
        local_product_id: entry.productId,
        environment: mode,
      },
    });
  }

  let price = await findExistingPrice(stripe, product.id, entry.amount, mode);

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: entry.amount,
      metadata: {
        local_product_id: entry.productId,
        environment: mode,
      },
    });
  }

  return {
    ...entry,
    stripeProductId: product.id,
    stripePriceId: price.id,
  };
}

async function main() {
  const envContents = readEnvFile();
  const stripeSecretKey = readStripeSecretKey(envContents);

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY. Add it to .env.local or export it before running this script.");
  }

  const mode = getModeFromKey(stripeSecretKey);
  const stripe = new Stripe(stripeSecretKey);
  const syncedEntries = [];

  for (const entry of catalog) {
    const syncedEntry = await ensureCatalogEntry(stripe, entry, mode);
    syncedEntries.push(syncedEntry);
  }

  let nextEnvContents = envContents;

  for (const entry of syncedEntries) {
    nextEnvContents = upsertEnvValue(nextEnvContents, entry.envKey, entry.stripePriceId);
  }

  fs.writeFileSync(envLocalPath, nextEnvContents);

  console.log(`Stripe ${mode} catalog is ready:\n`);

  for (const entry of syncedEntries) {
    console.log(`${entry.name}`);
    console.log(`  Product ID: ${entry.stripeProductId}`);
    console.log(`  Price ID: ${entry.stripePriceId}`);
    console.log(`  Amount: $${(entry.amount / 100).toFixed(2)}`);
    console.log(`  Env: ${entry.envKey}`);
  }

  console.log("\n.env.local updated with Stripe price IDs.");
  console.log("Copy these values into Vercel for the same environment before redeploying.");
}

main().catch((error) => {
  console.error("Stripe catalog sync failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
