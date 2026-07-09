# Claude Code Instructions

Follow `AGENTS.md` and the contract in `agent/commerce-analyst.md`.

For non-interactive execution, the repository runner calls Claude Code in print mode with plan permissions. Return one JSON object with no Markdown wrapper. The output must validate against `schemas/agent-output.schema.json`.

Never invent missing consent, deliverability, inventory, or campaign information. Keep `reviewRequired` set to `true`.
