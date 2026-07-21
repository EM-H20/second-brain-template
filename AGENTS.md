# Agent Rules

**The single source of truth for all rules in this repository is `SECOND-BRAIN.md`.**
Read `SECOND-BRAIN.md` in full at the start of every session and follow it exactly.
It is written tool-neutrally: everything in it applies to Codex, Gemini,
Cursor, and any other agent working in this repo, not just Claude Code.

It defines:

- The knowledge vault layout under `knowledge/`
- The strict frontmatter schema (how to find notes without reading everything)
- The topic vocabulary rules (`knowledge/clusters/_topics.md`)
- Workflows W1–W6: meeting ingestion, clustering, context-driven build,
  conflict detection, report generation, issue knowledge loop

## Command equivalents

Claude Code exposes these workflows as slash commands in `.claude/commands/`.
For Codex, the same prompts are provided in `.codex/prompts/` (if your Codex
version only reads global prompts, copy them to `~/.codex/prompts/`).

If no command mechanism is available, plain natural language works: the
workflows in SECOND-BRAIN.md are triggered by intent, not by command names.
"이 회의 전사체 볼트에 넣어줘" must execute workflow W1 fully — including
automatic conflict detection — exactly as `/ingest-meeting` would.

| Intent | Workflow |
|---|---|
| Ingest a meeting transcript | W1 (includes W4 conflict check) |
| Reorganize topic clusters | W2 |
| Implement from vault context | W3 (includes W4 + W6 checks) |
| Check an opinion against past decisions | W4 |
| Generate a report from a given format | W5 |
| Ingest an issue / completion report | W6 |
| Ingest a document (기획서/스펙/아티클) | W7 |
| Find similar past issues | W6 recurrence detection |

## Non-negotiables (repeated here for emphasis)

- Never silently overwrite a decision — surface conflicts and ask.
- Never delete decision history — use the supersede chain.
- Keep frontmatter valid and schema-compliant on every write.
- Vault files are the source of truth over chat memory.
- Append every vault write to `knowledge/log.md` (append-only); read its
  tail at session start to recover context.
