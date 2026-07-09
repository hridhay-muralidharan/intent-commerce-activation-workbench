import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardText,
  Code,
  Database,
  Gauge,
  Moon,
  Package,
  ShieldCheck,
  Sparkle,
  Sun,
  Warning,
  X
} from "@phosphor-icons/react";
import { createCachedAnalysis } from "./agentExamples";
import { calculateAttribution, detectOpportunities, validateDataset } from "./engine";
import { commerceDataset } from "./sampleData";
import type { Opportunity, ReviewStatus } from "./types";
import "./styles.css";

type View = "activation" | "evidence" | "evaluation" | "about";
type ThemeMode = "light" | "dark";

const reviewCopy: Record<ReviewStatus, string> = {
  awaiting_review: "Awaiting review",
  approved: "Approved",
  edited: "Edited and approved",
  rejected: "Rejected"
};

const evaluationCases = [
  ["Clear restock opportunity", "Pass", "Evidence and action aligned"],
  ["Incomplete inventory", "Pass", "Recommendation withheld"],
  ["Stale inventory", "Pass", "Review required"],
  ["Conflicting product records", "Pass", "Conflict surfaced"],
  ["No meaningful opportunity", "Pass", "No action proposed"],
  ["Misleading correlation", "Pass", "Causal claim blocked"],
  ["Missing campaign history", "Pass", "Confidence reduced"],
  ["Unsupported revenue claim", "Pass", "Claim rejected"],
  ["Human escalation required", "Pass", "Approval retained"],
  ["Malformed agent JSON", "Pass", "Import rejected"],
  ["Invalid evidence reference", "Pass", "Reference rejected"],
  ["Low-confidence recommendation", "Review", "Threshold needs calibration"]
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function App() {
  const [view, setView] = useState<View>("activation");
  const [theme, setTheme] = useState<ThemeMode>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [merchantId, setMerchantId] = useState(commerceDataset.merchants[0].id);
  const opportunities = useMemo(
    () => detectOpportunities(commerceDataset, merchantId),
    [merchantId]
  );
  const [selectedId, setSelectedId] = useState(opportunities[0]?.id ?? "");
  const [reviews, setReviews] = useState<Record<string, ReviewStatus>>(() => {
    const stored = localStorage.getItem("intent-commerce-reviews");
    return stored ? (JSON.parse(stored) as Record<string, ReviewStatus>) : {};
  });
  const [editing, setEditing] = useState(false);
  const [editedAction, setEditedAction] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  useEffect(() => {
    const next = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];
    setSelectedId(next?.id ?? "");
    setEditing(false);
  }, [merchantId, opportunities, selectedId]);

  useEffect(() => {
    localStorage.setItem("intent-commerce-reviews", JSON.stringify(reviews));
  }, [reviews]);

  const selected = opportunities.find((item) => item.id === selectedId) ?? null;
  const product = selected
    ? commerceDataset.products.find((item) => item.id === selected.productId) ?? null
    : null;
  const merchant = commerceDataset.merchants.find((item) => item.id === merchantId)!;
  const analysis = selected && product ? createCachedAnalysis(selected, product) : null;
  const attribution = selected ? calculateAttribution(selected, commerceDataset) : null;
  const datasetErrors = validateDataset(commerceDataset);
  const status = selected ? reviews[selected.id] ?? selected.status : "awaiting_review";

  function updateReview(nextStatus: ReviewStatus) {
    if (!selected) return;
    setReviews((current) => ({ ...current, [selected.id]: nextStatus }));
    setEditing(false);
  }

  function beginEdit() {
    if (!analysis) return;
    setEditedAction(analysis.recommendedAction);
    setEditing(true);
  }

  return (
      <div className="app-shell">
        <header className="topbar">
          <button className="brand" onClick={() => setView("activation")} type="button">
            <span className="brand-mark"><Sparkle size={18} weight="fill" /></span>
            <span>Intent Commerce</span>
          </button>
          <nav aria-label="Primary navigation">
            {(["activation", "evidence", "evaluation", "about"] as View[]).map((item) => (
              <button
                className={view === item ? "nav-button active" : "nav-button"}
                key={item}
                onClick={() => setView(item)}
                type="button"
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
          <button
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="icon-button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            type="button"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>

        <main>
          {view === "activation" && (
            <>
              <section className="intro-grid">
                <div>
                  <p className="eyebrow">Merchant activation workbench</p>
                  <h1>Turn intent into a decision someone can defend.</h1>
                  <p className="intro-copy">
                    Real calculations, inspectable evidence, bounded agent analysis, and human approval in one workflow.
                  </p>
                </div>
                <div className="merchant-control">
                  <label htmlFor="merchant">Merchant dataset</label>
                  <select
                    id="merchant"
                    onChange={(event) => setMerchantId(event.target.value)}
                    value={merchantId}
                  >
                    {commerceDataset.merchants.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <p>{merchant.category}. Synthetic dataset generated on 9 July 2026.</p>
                </div>
              </section>

              {datasetErrors.length > 0 ? (
                <section className="error-state" role="alert">
                  <Warning size={24} />
                  <div>
                    <h2>Dataset validation failed</h2>
                    {datasetErrors.map((error) => <p key={error}>{error}</p>)}
                  </div>
                </section>
              ) : opportunities.length === 0 ? (
                <section className="empty-state">
                  <ClipboardText size={30} />
                  <h2>No activation opportunity passed the threshold.</h2>
                  <p>The engine does not invent a recommendation when evidence is weak.</p>
                </section>
              ) : (
                <section className="workbench-grid">
                  <aside className="opportunity-rail" aria-label="Detected opportunities">
                    <div className="rail-heading">
                      <span>Detected opportunities</span>
                      <strong>{opportunities.length}</strong>
                    </div>
                    {opportunities.map((opportunity) => (
                      <button
                        className={selected?.id === opportunity.id ? "opportunity-row selected" : "opportunity-row"}
                        key={opportunity.id}
                        onClick={() => setSelectedId(opportunity.id)}
                        type="button"
                      >
                        <span className="row-type">{opportunity.type.replaceAll("_", " ")}</span>
                        <strong>{opportunity.title}</strong>
                        <span>{opportunity.addressableShoppers} shoppers</span>
                        <span className="row-value">{formatCurrency(opportunity.estimatedRevenue)} scenario value</span>
                      </button>
                    ))}
                  </aside>

                  {selected && analysis && product && (
                    <div className="decision-column">
                      <div className="decision-header">
                        <div>
                          <span className={`status status-${status}`}>{reviewCopy[status]}</span>
                          <h2>{selected.title}</h2>
                          <p>{product.name}, {product.variant}</p>
                        </div>
                        <span className="confidence">{selected.confidence}% evidence confidence</span>
                      </div>

                      <div className="metric-band">
                        <div><span>Addressable</span><strong>{selected.addressableShoppers}</strong><small>unique shoppers</small></div>
                        <div><span>Assumption</span><strong>{formatPercent(selected.assumedConversionRate)}</strong><small>scenario conversion</small></div>
                        <div><span>Scenario value</span><strong>{formatCurrency(selected.estimatedRevenue)}</strong><small>not a forecast</small></div>
                      </div>

                      <section className="analysis-block">
                        <div className="block-heading">
                          <div><Sparkle size={20} /><h3>Agent analysis</h3></div>
                          <span>Cached example run</span>
                        </div>
                        <p>{analysis.merchantBrief}</p>
                        <div className="recommendation">
                          <span>Recommended action</span>
                          {editing ? (
                            <>
                              <label className="sr-only" htmlFor="edited-action">Edit recommended action</label>
                              <textarea
                                id="edited-action"
                                onChange={(event) => setEditedAction(event.target.value)}
                                value={editedAction}
                              />
                            </>
                          ) : (
                            <strong>{analysis.recommendedAction}</strong>
                          )}
                        </div>
                        <div className="campaign-draft">
                          <span>Email draft</span>
                          <strong>{analysis.campaignDraft.subject}</strong>
                          <p>{analysis.campaignDraft.body}</p>
                        </div>
                        <div className="analysis-meta">
                          <span><ShieldCheck size={16} /> Human review required</span>
                          <span><Database size={16} /> {analysis.evidenceRefs.length} evidence references</span>
                          <span><Code size={16} /> {analysis.provenance.promptVersion}</span>
                        </div>
                      </section>

                      <div className="review-actions" aria-label="Review decision">
                        {editing ? (
                          <>
                            <button className="primary-action" onClick={() => updateReview("edited")} type="button">
                              <Check size={17} /> Save and approve
                            </button>
                            <button className="secondary-action" onClick={() => setEditing(false)} type="button">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="primary-action" onClick={() => updateReview("approved")} type="button">
                              <Check size={17} /> Approve
                            </button>
                            <button className="secondary-action" onClick={beginEdit} type="button">Edit action</button>
                            <button className="text-action danger" onClick={() => updateReview("rejected")} type="button">
                              <X size={17} /> Reject
                            </button>
                            <button className="text-action" onClick={() => setView("evidence")} type="button">
                              Inspect evidence <ArrowRight size={16} />
                            </button>
                          </>
                        )}
                      </div>

                      {attribution && (
                        <section className="attribution-block">
                          <div className="block-heading">
                            <div><Gauge size={20} /><h3>Measured outcome</h3></div>
                            <span>Synthetic holdout data</span>
                          </div>
                          <div className="attribution-grid">
                            <div><span>Treatment</span><strong>{formatPercent(attribution.treatmentRate)}</strong></div>
                            <div><span>Holdout</span><strong>{formatPercent(attribution.controlRate)}</strong></div>
                            <div><span>Incremental orders</span><strong>{attribution.incrementalConversions}</strong></div>
                            <div><span>Attributed revenue</span><strong>{formatCurrency(attribution.attributedRevenue)}</strong></div>
                          </div>
                          <p>{attribution.explanation}</p>
                        </section>
                      )}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {view === "evidence" && selected && (
            <section className="page-section">
              <div className="page-heading">
                <span>Evidence board</span>
                <h1>Every recommendation must point back to a record.</h1>
                <p>{selected.confidenceReason}</p>
              </div>
              <div className="evidence-grid">
                {selected.evidence.map((item) => (
                  <article className="evidence-card" key={item.id}>
                    <span>{item.label}</span>
                    <h2>{item.detail}</h2>
                    <p>{item.sourceRefs.length || "No"} source reference{item.sourceRefs.length === 1 ? "" : "s"}</p>
                    <details>
                      <summary>Inspect references</summary>
                      <code>{item.sourceRefs.length ? item.sourceRefs.slice(0, 12).join("\n") : "Absence verified against campaign history."}</code>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === "evaluation" && (
            <section className="page-section">
              <div className="page-heading">
                <span>Evaluation suite</span>
                <h1>The workflow is tested for restraint, not just output quality.</h1>
                <p>Results below use the committed synthetic scenarios. Eleven pass and one remains under review.</p>
              </div>
              <div className="evaluation-layout">
                <div className="evaluation-summary">
                  <strong>11 / 12</strong>
                  <span>cases pass</span>
                  <p>One calibration case remains visible instead of being hidden behind a perfect score.</p>
                </div>
                <div className="evaluation-cases">
                  {evaluationCases.map(([name, result, note]) => (
                    <div className="evaluation-case" key={name}>
                      <div><strong>{name}</strong><span>{note}</span></div>
                      <span className={result === "Pass" ? "case-pass" : "case-review"}>{result}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {view === "about" && (
            <section className="page-section about-layout">
              <div className="page-heading">
                <span>How it works</span>
                <h1>A credential-free public demo with a real local agent path.</h1>
                <p>The browser never calls a model. Cloned repositories can run the same packet through Codex or Claude Code.</p>
              </div>
              <div className="architecture-flow" aria-label="System architecture">
                <div><Database size={24} /><strong>Synthetic commerce data</strong><span>Validated records and traceable IDs</span></div>
                <ArrowRight size={22} />
                <div><Gauge size={24} /><strong>Deterministic engine</strong><span>Detection, calculation, and attribution</span></div>
                <ArrowRight size={22} />
                <div><Sparkle size={24} /><strong>CLI agent</strong><span>Bounded analysis against a JSON schema</span></div>
                <ArrowRight size={22} />
                <div><ShieldCheck size={24} /><strong>Human decision</strong><span>Approve, edit, reject, and audit</span></div>
              </div>
              <div className="principles-grid">
                <article><Package size={22} /><h2>Cloneable</h2><p>Install locally and create a fresh work packet without purchasing an API key.</p></article>
                <article><ClipboardText size={22} /><h2>Inspectable</h2><p>Inputs, assumptions, evidence, prompts, schema, and failures remain visible.</p></article>
                <article><ShieldCheck size={22} /><h2>Bounded</h2><p>The agent recommends. Deterministic code calculates. A person owns activation.</p></article>
              </div>
            </section>
          )}
        </main>
      </div>
  );
}
