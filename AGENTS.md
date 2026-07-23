# Agent Rules

**The single source of truth for all rules in this repository is `SECOND-BRAIN.md`.**
Read `SECOND-BRAIN.md` in full at the start of every session and follow it exactly.
It is written tool-neutrally: everything in it applies to Codex, Gemini,
Cursor, and any other agent working in this repo, not just Claude Code.

It defines:

- The knowledge vault layout under `knowledge/`
- The strict frontmatter schema (how to find notes without reading everything)
- The topic vocabulary rules (`knowledge/clusters/_topics.md`)
- Workflows W1–W8: ingestion, clustering, context-driven build, conflict
  detection, reports, issue recurrence, and reusable lessons

## Command equivalents

Claude Code exposes these workflows as slash commands in `.claude/commands/`.
Codex discovers the repository skill at `.agents/skills/second-brain/SKILL.md`;
invoke it with natural language or `$second-brain`. `.codex/prompts/` is kept
only for deprecated custom-prompt compatibility.

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
| Capture a reusable work rule / lesson | W8 |
| Recall topic context | W3 + W4 + W6 + W8 |
| Maintain the vault | W2 full + W8 |

## Non-negotiables (repeated here for emphasis)

- Never silently overwrite a decision — surface conflicts and ask.
- Never delete decision history — use the supersede chain.
- Keep frontmatter valid and schema-compliant on every write.
- Vault files are the source of truth over chat memory.
- Append every vault write to `knowledge/log.md` (append-only); read its
  tail at session start to recover context.
