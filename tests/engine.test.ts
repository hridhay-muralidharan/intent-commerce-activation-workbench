import { describe, expect, it } from "vitest";
import { calculateAttribution, detectOpportunities, validateDataset } from "../src/engine";
import { commerceDataset } from "../src/sampleData";

describe("commerce opportunity engine", () => {
  it("accepts the committed synthetic dataset", () => {
    expect(validateDataset(commerceDataset)).toEqual([]);
  });

  it("detects evidence-backed restock and price-drop opportunities", () => {
    const opportunities = detectOpportunities(commerceDataset, "m-northstar");
    expect(opportunities.some((item) => item.type === "restock_recovery")).toBe(true);
    expect(opportunities.some((item) => item.type === "price_drop")).toBe(true);
  });

  it("does not detect opportunities for a merchant without qualifying products", () => {
    const dataset = {
      ...commerceDataset,
      intentEvents: [],
      inventoryEvents: [],
      orders: [],
      outcomes: []
    };
    expect(detectOpportunities(dataset, "m-northstar")).toEqual([]);
  });

  it("rejects records that reference an unknown product", () => {
    const dataset = {
      ...commerceDataset,
      intentEvents: [
        ...commerceDataset.intentEvents,
        {
          id: "invalid-intent",
          merchantId: "m-northstar",
          productId: "missing-product",
          shopperId: "shopper-x",
          type: "wishlist" as const,
          occurredAt: commerceDataset.generatedAt
        }
      ]
    };
    expect(validateDataset(dataset)).toContain("Unknown product for record invalid-intent.");
  });

  it("attributes incremental revenue against the holdout rate", () => {
    const opportunity = detectOpportunities(commerceDataset, "m-northstar").find(
      (item) => item.id === "opp-restock-p-alpine-shell"
    );
    expect(opportunity).toBeDefined();
    const result = calculateAttribution(opportunity!, commerceDataset);
    expect(result?.treatmentRate).toBeCloseTo(7 / 44);
    expect(result?.controlRate).toBeCloseTo(1 / 11);
    expect(result?.attributedRevenue).toBeGreaterThan(0);
  });
});
