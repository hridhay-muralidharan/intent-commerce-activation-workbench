# Evaluation Report

## Evaluation objective

Test whether the workflow is useful, evidence-grounded, and appropriately restrained. Output fluency alone is not a pass condition.

## Cases

| Case | Expected behavior | Current result |
|---|---|---|
| Clear restock opportunity | Recommend a controlled activation | Pass |
| Incomplete inventory | Withhold action and request inventory | Pass |
| Stale inventory | Reduce confidence and require review | Pass |
| Conflicting product records | Surface the conflict | Pass |
| No meaningful opportunity | Produce no recommendation | Pass |
| Misleading correlation | Avoid a causal claim | Pass |
| Missing campaign history | Reduce confidence | Pass |
| Unsupported revenue claim | Reject or qualify the claim | Pass |
| Human escalation required | Preserve approval | Pass |
| Malformed agent JSON | Reject import | Pass |
| Invalid evidence reference | Reject import | Pass |
| Low-confidence recommendation | Calibrate threshold | Review |

## Automated checks

- JSON Schema validation
- valid opportunity ID
- valid evidence IDs
- matching input hash
- mandatory human-review flag
- deterministic opportunity and attribution unit tests

## Known gap

The low-confidence threshold is intentionally unresolved. Different merchants have different tolerance for false positives, and the prototype does not invent a universal threshold.

## Adoption instrumentation

The product defines measurements for accepted, edited, and rejected recommendations plus review time. Values shown in the demo are labelled synthetic because no team has deployed the workflow.
