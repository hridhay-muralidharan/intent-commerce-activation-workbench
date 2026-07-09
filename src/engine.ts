import type {
  AttributionResult,
  CommerceDataset,
  EvidenceItem,
  Opportunity,
  Product
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(earlier: string, later: string): number {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / DAY;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function productEvidence(product: Product): EvidenceItem {
  return {
    id: `evidence-product-${product.id}`,
    label: "Product state",
    detail: `${product.name}, ${product.variant}, current price $${product.currentPrice}.`,
    sourceRefs: [product.id]
  };
}

export function validateDataset(dataset: CommerceDataset): string[] {
  const errors: string[] = [];
  const merchantIds = new Set(dataset.merchants.map((merchant) => merchant.id));
  const productIds = new Set(dataset.products.map((product) => product.id));
  const ids = [
    ...dataset.intentEvents.map((event) => event.id),
    ...dataset.inventoryEvents.map((event) => event.id),
    ...dataset.orders.map((order) => order.id),
    ...dataset.campaigns.map((campaign) => campaign.id)
  ];

  if (new Set(ids).size !== ids.length) errors.push("Event IDs must be unique.");
  dataset.products.forEach((product) => {
    if (!merchantIds.has(product.merchantId)) errors.push(`Unknown merchant for product ${product.id}.`);
    if (product.currentPrice <= 0) errors.push(`Invalid price for product ${product.id}.`);
  });
  [...dataset.intentEvents, ...dataset.inventoryEvents, ...dataset.orders, ...dataset.campaigns].forEach(
    (record) => {
      if (!merchantIds.has(record.merchantId)) errors.push(`Unknown merchant for record ${record.id}.`);
      if (!productIds.has(record.productId)) errors.push(`Unknown product for record ${record.id}.`);
    }
  );
  return unique(errors);
}

export function detectOpportunities(dataset: CommerceDataset, merchantId?: string): Opportunity[] {
  const errors = validateDataset(dataset);
  if (errors.length) throw new Error(errors.join(" "));

  const referenceTime = dataset.generatedAt;
  const products = dataset.products.filter((product) => !merchantId || product.merchantId === merchantId);
  const opportunities: Opportunity[] = [];

  products.forEach((product) => {
    const intents = dataset.intentEvents.filter((event) => event.productId === product.id);
    const orders = dataset.orders.filter((order) => order.productId === product.id);
    const convertedShopperIds = new Set(orders.map((order) => order.shopperId));
    const addressableShopperIds = unique(
      intents.filter((event) => !convertedShopperIds.has(event.shopperId)).map((event) => event.shopperId)
    );
    const conversionRate = intents.length ? convertedShopperIds.size / unique(intents.map((event) => event.shopperId)).length : 0;
    const recentRestock = dataset.inventoryEvents.find(
      (event) =>
        event.productId === product.id &&
        event.quantityBefore === 0 &&
        event.quantityAfter > 0 &&
        daysBetween(event.occurredAt, referenceTime) <= 7
    );
    const hasRecentCampaign = (types: string[]) =>
      dataset.campaigns.some(
        (campaign) =>
          campaign.productId === product.id &&
          types.includes(campaign.type) &&
          daysBetween(campaign.sentAt, referenceTime) <= 30
      );

    if (recentRestock && addressableShopperIds.length >= 10 && !hasRecentCampaign(["restock"])) {
      const assumedConversionRate = 0.08;
      opportunities.push({
        id: `opp-restock-${product.id}`,
        merchantId: product.merchantId,
        productId: product.id,
        type: "restock_recovery",
        title: "Restocked demand has not been activated",
        summary: `${addressableShopperIds.length} shoppers expressed intent before inventory returned.`,
        addressableShoppers: addressableShopperIds.length,
        assumedConversionRate,
        estimatedRevenue: money(addressableShopperIds.length * assumedConversionRate * product.currentPrice),
        confidence: 92,
        confidenceReason: "Recent inventory change, identifiable shoppers, and no matching campaign are present.",
        evidence: [
          productEvidence(product),
          {
            id: `evidence-intent-${product.id}`,
            label: "Unconverted intent",
            detail: `${addressableShopperIds.length} unique shoppers remain addressable.`,
            sourceRefs: intents.map((event) => event.id)
          },
          {
            id: `evidence-restock-${product.id}`,
            label: "Inventory returned",
            detail: `Inventory moved from ${recentRestock.quantityBefore} to ${recentRestock.quantityAfter} units.`,
            sourceRefs: [recentRestock.id]
          },
          {
            id: `evidence-campaign-${product.id}`,
            label: "Activation gap",
            detail: "No restock campaign exists in the last 30 days.",
            sourceRefs: []
          }
        ],
        status: "awaiting_review"
      });
    }

    if (
      product.priceDropAt &&
      product.currentPrice < product.listPrice &&
      addressableShopperIds.length >= 10 &&
      !hasRecentCampaign(["price_drop"])
    ) {
      const assumedConversionRate = 0.06;
      opportunities.push({
        id: `opp-price-${product.id}`,
        merchantId: product.merchantId,
        productId: product.id,
        type: "price_drop",
        title: "A price drop has an unnotified audience",
        summary: `${addressableShopperIds.length} interested shoppers have not received a price-drop message.`,
        addressableShoppers: addressableShopperIds.length,
        assumedConversionRate,
        estimatedRevenue: money(addressableShopperIds.length * assumedConversionRate * product.currentPrice),
        confidence: 89,
        confidenceReason: "The price change and eligible audience are complete; campaign history shows no activation.",
        evidence: [
          productEvidence(product),
          {
            id: `evidence-discount-${product.id}`,
            label: "Price movement",
            detail: `Price changed from $${product.listPrice} to $${product.currentPrice}.`,
            sourceRefs: [product.id]
          },
          {
            id: `evidence-intent-${product.id}`,
            label: "Eligible audience",
            detail: `${addressableShopperIds.length} interested shoppers have not purchased.`,
            sourceRefs: intents.map((event) => event.id)
          }
        ],
        status: "awaiting_review"
      });
    }

    if (intents.length >= 20 && conversionRate < 0.08) {
      const assumedConversionRate = 0.04;
      opportunities.push({
        id: `opp-conversion-${product.id}`,
        merchantId: product.merchantId,
        productId: product.id,
        type: "high_intent_low_conversion",
        title: "High intent is not becoming orders",
        summary: `${unique(intents.map((event) => event.shopperId)).length} shoppers showed intent while observed conversion remained ${(conversionRate * 100).toFixed(1)}%.`,
        addressableShoppers: addressableShopperIds.length,
        assumedConversionRate,
        estimatedRevenue: money(addressableShopperIds.length * assumedConversionRate * product.currentPrice),
        confidence: orders.length ? 84 : 72,
        confidenceReason: orders.length
          ? "Intent and order records support the conversion gap."
          : "The intent signal is strong, but no order history is available for comparison.",
        evidence: [
          productEvidence(product),
          {
            id: `evidence-conversion-${product.id}`,
            label: "Observed behavior",
            detail: `${intents.length} intent events and ${orders.length} observed orders.`,
            sourceRefs: [...intents.map((event) => event.id), ...orders.map((order) => order.id)]
          }
        ],
        status: "awaiting_review"
      });
    }

    const saveLaterEvents = intents.filter((event) => event.type === "save_later");
    if (saveLaterEvents.length >= 8 && !hasRecentCampaign(["intent_recovery"])) {
      const assumedConversionRate = 0.035;
      opportunities.push({
        id: `opp-unactivated-${product.id}`,
        merchantId: product.merchantId,
        productId: product.id,
        type: "unactivated_intent",
        title: "Save-for-later intent has no recovery path",
        summary: `${saveLaterEvents.length} save-for-later events have no corresponding recovery campaign.`,
        addressableShoppers: addressableShopperIds.length,
        assumedConversionRate,
        estimatedRevenue: money(addressableShopperIds.length * assumedConversionRate * product.currentPrice),
        confidence: 81,
        confidenceReason: "Intent records and campaign history are present; motivation remains unknown.",
        evidence: [
          productEvidence(product),
          {
            id: `evidence-save-later-${product.id}`,
            label: "Unactivated saves",
            detail: `${saveLaterEvents.length} save-for-later events are available for activation.`,
            sourceRefs: saveLaterEvents.map((event) => event.id)
          }
        ],
        status: "awaiting_review"
      });
    }
  });

  return opportunities.sort((left, right) => {
    const leftValue = left.estimatedRevenue * (left.confidence / 100);
    const rightValue = right.estimatedRevenue * (right.confidence / 100);
    return rightValue - leftValue;
  });
}

export function calculateAttribution(
  opportunity: Opportunity,
  dataset: CommerceDataset
): AttributionResult | null {
  const outcome = dataset.outcomes.find((candidate) => candidate.opportunityId === opportunity.id);
  if (!outcome || !outcome.treatmentShoppers || !outcome.controlShoppers) return null;
  const treatmentRate = outcome.treatmentConversions / outcome.treatmentShoppers;
  const controlRate = outcome.controlConversions / outcome.controlShoppers;
  const incrementalConversions = Math.max(
    0,
    outcome.treatmentConversions - controlRate * outcome.treatmentShoppers
  );
  const attributedRevenue = money(
    incrementalConversions * (outcome.realizedRevenue / Math.max(outcome.treatmentConversions, 1))
  );
  return {
    treatmentRate,
    controlRate,
    incrementalConversions: money(incrementalConversions),
    attributedRevenue,
    explanation: `Attributed revenue uses the treatment conversion rate minus the holdout conversion rate, multiplied by the treatment audience and realized average order value.`
  };
}
