# Product and Engineering Decisions

## Deterministic calculations remain outside the agent

Audience size, conversion assumptions, scenario value, and holdout attribution are calculated in TypeScript. The agent explains and recommends but cannot rewrite those values.

## CLI agents replace direct model APIs

The intended evaluator already has Codex or Claude Code access through a subscription. A repository-aware CLI agent can inspect the packet and return structured output without requiring a separate API account.

## The public demo uses cached output

GitHub Pages cannot safely hold model credentials. The deployed demo is deterministic and clearly labels committed agent output. A clone can generate a fresh run.

## Human approval is structural

Every recommendation enters an awaiting-review state. The product exposes approve, edit, and reject paths. No agent output can bypass this boundary.

## Synthetic numbers stay labelled

The dataset, conversion assumptions, and measured outcomes are synthetic. They demonstrate the operating model, not merchant performance.
