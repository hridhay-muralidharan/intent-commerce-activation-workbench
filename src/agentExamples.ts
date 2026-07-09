import type { AgentAnalysis, Opportunity, Product } from "./types";

export function createCachedAnalysis(opportunity: Opportunity, product: Product): AgentAnalysis {
  const actionByType: Record<Opportunity["type"], string> = {
    restock_recovery:
      "Prepare a back-in-stock email for the eligible audience, reserve a holdout group, and require inventory confirmation before send.",
    price_drop:
      "Prepare a price-drop email for shoppers with prior intent, exclude recent purchasers, and preserve a holdout group.",
    high_intent_low_conversion:
      "Investigate product-page friction before sending another campaign. Compare variant availability, delivery promise, and return-policy visibility.",
    unactivated_intent:
      "Create a save-for-later recovery test with a product reminder, current availability, and a measured holdout group."
  };

  const subjectByType: Record<Opportunity["type"], string> = {
    restock_recovery: `${product.name} is available again`,
    price_drop: `A new price for ${product.name}`,
    high_intent_low_conversion: `Still considering ${product.name}?`,
    unactivated_intent: `Your saved ${product.name}`
  };

  return {
    schemaVersion: "1.0",
    runId: `cached-${opportunity.id}`,
    opportunityId: opportunity.id,
    merchantBrief: `${opportunity.summary} The estimated value is a scenario assumption, not a forecast. The source data supports a controlled activation test with human approval.`,
    recommendedAction: actionByType[opportunity.type],
    campaignDraft: {
      subject: subjectByType[opportunity.type],
      body: `You showed interest in ${product.name}. It is available now. Review the current price and availability before deciding.`,
      channel: "email"
    },
    evidenceRefs: opportunity.evidence.map((item) => item.id),
    missingInformation: [
      "Current deliverability and consent status",
      "Merchant-specific suppression rules"
    ],
    risks: [
      "Inventory may change before activation",
      "Estimated revenue depends on a stated conversion assumption"
    ],
    confidence: Math.min(opportunity.confidence, 88),
    reviewRequired: true,
    provenance: {
      mode: "cached_example",
      agent: "Codex CLI example run",
      createdAt: "2026-07-09T09:00:00.000Z",
      inputHash: "sample-run-cd31a4",
      promptVersion: "commerce-analyst-1.0"
    }
  };
}
