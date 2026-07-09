import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let seed = 2049;

function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function isoFromOffset(offsetDays) {
  const base = new Date("2026-07-09T08:00:00.000Z").getTime();
  return new Date(base + offsetDays * 86400000).toISOString();
}

const merchants = [
  ["m-northstar", "Northstar Outdoor", "Outdoor apparel"],
  ["m-lumen", "Lumen House", "Home lighting"],
  ["m-rivulet", "Rivulet Running", "Performance footwear"]
].map(([id, name, category]) => ({ id, name, category, currency: "USD" }));

const products = Array.from({ length: 36 }, (_, index) => {
  const merchant = merchants[index % merchants.length];
  const basePrice = 60 + Math.round(random() * 240);
  return {
    id: `product-${index + 1}`,
    merchantId: merchant.id,
    name: `${["Alpine", "Arc", "Pace", "Harbor", "Field", "Contour"][index % 6]} ${["Shell", "Lamp", "Trainer", "Pack", "Layer", "Light"][Math.floor(index / 3) % 6]}`,
    variant: `Variant ${String.fromCharCode(65 + (index % 5))}`,
    currentPrice: basePrice,
    listPrice: index % 5 === 0 ? basePrice + 30 : basePrice
  };
});

const intentEvents = Array.from({ length: 3600 }, (_, index) => {
  const product = products[Math.floor(random() * products.length)];
  return {
    id: `intent-${index + 1}`,
    merchantId: product.merchantId,
    productId: product.id,
    shopperId: `shopper-${Math.floor(random() * 1800) + 1}`,
    type: ["wishlist", "save_later", "back_in_stock"][Math.floor(random() * 3)],
    occurredAt: isoFromOffset(-Math.floor(random() * 45))
  };
});

const orders = Array.from({ length: 720 }, (_, index) => {
  const product = products[Math.floor(random() * products.length)];
  return {
    id: `order-${index + 1}`,
    merchantId: product.merchantId,
    productId: product.id,
    shopperId: `shopper-${Math.floor(random() * 1800) + 1}`,
    amount: product.currentPrice,
    occurredAt: isoFromOffset(-Math.floor(random() * 30))
  };
});

const dataset = {
  generatedAt: "2026-07-09T08:00:00.000Z",
  seed: 2049,
  synthetic: true,
  merchants,
  products,
  intentEvents,
  inventoryEvents: [],
  orders,
  campaigns: [],
  outcomes: []
};

const output = join(root, "data", "generated-commerce-dataset.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Generated ${intentEvents.length} intent events and ${orders.length} orders at ${output}`);
