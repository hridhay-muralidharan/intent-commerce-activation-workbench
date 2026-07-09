# Agent Instructions

This repository demonstrates a bounded merchant-activation workflow.

When asked to analyze a scenario:

1. Read `agent/commerce-analyst.md`.
2. Read the requested scenario under `agent/scenarios/`.
3. Read `schemas/agent-output.schema.json`.
4. Return only schema-valid JSON.
5. Reference only evidence IDs present in the scenario.
6. Preserve human approval.
7. Treat all revenue estimates as scenario assumptions unless measured holdout data is provided.

Do not modify source data or send external actions.
