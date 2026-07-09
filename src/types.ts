export type IntentType = "wishlist" | "save_later" | "back_in_stock";
export type CampaignType = "restock" | "price_drop" | "intent_recovery";
export type OpportunityType =
  | "restock_recovery"
  | "price_drop"
  | "high_intent_low_conversion"
  | "unactivated_intent";
export type ReviewStatus = "awaiting_review" | "approved" | "edited" | "rejected";

export interface Merchant {
  id: string;
  name: string;
  category: string;
  currency: "USD";
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  variant: string;
  currentPrice: number;
  listPrice: number;
  priceDropAt?: string;
}

export interface IntentEvent {
  id: string;
  merchantId: string;
  productId: string;
  shopperId: string;
  type: IntentType;
  occurredAt: string;
}

export interface InventoryEvent {
  id: string;
  merchantId: string;
  productId: string;
  quantityBefore: number;
  quantityAfter: number;
  occurredAt: string;
}

export interface Order {
  id: string;
  merchantId: string;
  productId: string;
  shopperId: string;
  amount: number;
  occurredAt: string;
}

export interface Campaign {
  id: string;
  merchantId: string;
  productId: string;
  type: CampaignType;
  sentAt: string;
}

export interface CampaignOutcome {
  opportunityId: string;
  treatmentShoppers: number;
  treatmentConversions: number;
  controlShoppers: number;
  controlConversions: number;
  realizedRevenue: number;
}

export interface CommerceDataset {
  generatedAt: string;
  merchants: Merchant[];
  products: Product[];
  intentEvents: IntentEvent[];
  inventoryEvents: InventoryEvent[];
  orders: Order[];
  campaigns: Campaign[];
  outcomes: CampaignOutcome[];
}

export interface EvidenceItem {
  id: string;
  label: string;
  detail: string;
  sourceRefs: string[];
}

export interface Opportunity {
  id: string;
  merchantId: string;
  productId: string;
  type: OpportunityType;
  title: string;
  summary: string;
  addressableShoppers: number;
  assumedConversionRate: number;
  estimatedRevenue: number;
  confidence: number;
  confidenceReason: string;
  evidence: EvidenceItem[];
  status: ReviewStatus;
}

export interface AgentAnalysis {
  schemaVersion: "1.0";
  runId: string;
  opportunityId: string;
  merchantBrief: string;
  recommendedAction: string;
  campaignDraft: {
    subject: string;
    body: string;
    channel: "email" | "sms";
  };
  evidenceRefs: string[];
  missingInformation: string[];
  risks: string[];
  confidence: number;
  reviewRequired: true;
  provenance: {
    mode: "cached_example" | "cli_agent";
    agent: string;
    createdAt: string;
    inputHash: string;
    promptVersion: string;
  };
}

export interface AttributionResult {
  treatmentRate: number;
  controlRate: number;
  incrementalConversions: number;
  attributedRevenue: number;
  explanation: string;
}
