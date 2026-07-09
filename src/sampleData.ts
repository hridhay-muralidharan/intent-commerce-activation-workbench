import type { CommerceDataset, IntentEvent, Order } from "./types";

const generatedAt = "2026-07-09T08:00:00.000Z";
const day = 24 * 60 * 60 * 1000;
const asIso = (offsetDays: number) =>
  new Date(new Date(generatedAt).getTime() + offsetDays * day).toISOString();

function makeIntentEvents(
  merchantId: string,
  productId: string,
  type: IntentEvent["type"],
  count: number,
  offsetDays: number,
  prefix: string
): IntentEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-intent-${index + 1}`,
    merchantId,
    productId,
    shopperId: `${prefix}-shopper-${index + 1}`,
    type,
    occurredAt: asIso(offsetDays + (index % 3) * 0.1)
  }));
}

function makeOrders(
  merchantId: string,
  productId: string,
  count: number,
  amount: number,
  offsetDays: number,
  prefix: string
): Order[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-order-${index + 1}`,
    merchantId,
    productId,
    shopperId: `${prefix}-shopper-${index + 1}`,
    amount,
    occurredAt: asIso(offsetDays + index * 0.05)
  }));
}

export const commerceDataset: CommerceDataset = {
  generatedAt,
  merchants: [
    { id: "m-northstar", name: "Northstar Outdoor", category: "Outdoor apparel", currency: "USD" },
    { id: "m-lumen", name: "Lumen House", category: "Home lighting", currency: "USD" },
    { id: "m-rivulet", name: "Rivulet Running", category: "Performance footwear", currency: "USD" }
  ],
  products: [
    {
      id: "p-alpine-shell",
      merchantId: "m-northstar",
      name: "Alpine Storm Shell",
      variant: "Cedar / M",
      currentPrice: 188,
      listPrice: 188
    },
    {
      id: "p-camp-vest",
      merchantId: "m-northstar",
      name: "Ridgeline Camp Vest",
      variant: "Slate / L",
      currentPrice: 112,
      listPrice: 148,
      priceDropAt: asIso(-2)
    },
    {
      id: "p-arc-lamp",
      merchantId: "m-lumen",
      name: "Arc Reading Lamp",
      variant: "Graphite",
      currentPrice: 239,
      listPrice: 239
    },
    {
      id: "p-pace-trainer",
      merchantId: "m-rivulet",
      name: "Pace Daily Trainer",
      variant: "Chalk / US 9",
      currentPrice: 134,
      listPrice: 134
    }
  ],
  intentEvents: [
    ...makeIntentEvents("m-northstar", "p-alpine-shell", "back_in_stock", 34, -10, "alpine"),
    ...makeIntentEvents("m-northstar", "p-alpine-shell", "wishlist", 21, -14, "alpine-wish"),
    ...makeIntentEvents("m-northstar", "p-camp-vest", "wishlist", 28, -16, "vest"),
    ...makeIntentEvents("m-lumen", "p-arc-lamp", "wishlist", 47, -20, "arc"),
    ...makeIntentEvents("m-rivulet", "p-pace-trainer", "save_later", 31, -12, "pace")
  ],
  inventoryEvents: [
    {
      id: "inventory-alpine-restock",
      merchantId: "m-northstar",
      productId: "p-alpine-shell",
      quantityBefore: 0,
      quantityAfter: 42,
      occurredAt: asIso(-1)
    }
  ],
  orders: [
    ...makeOrders("m-northstar", "p-camp-vest", 1, 112, -1, "vest"),
    ...makeOrders("m-lumen", "p-arc-lamp", 2, 239, -4, "arc"),
    ...makeOrders("m-rivulet", "p-pace-trainer", 1, 134, -3, "pace")
  ],
  campaigns: [],
  outcomes: [
    {
      opportunityId: "opp-restock-p-alpine-shell",
      treatmentShoppers: 44,
      treatmentConversions: 7,
      controlShoppers: 11,
      controlConversions: 1,
      realizedRevenue: 1316
    },
    {
      opportunityId: "opp-price-p-camp-vest",
      treatmentShoppers: 22,
      treatmentConversions: 4,
      controlShoppers: 6,
      controlConversions: 0,
      realizedRevenue: 448
    }
  ]
};
