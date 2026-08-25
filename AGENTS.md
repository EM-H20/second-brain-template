# Agent Rules

**The single source of truth for all rules in this repository is `SECOND-BRAIN.md`.**
Read `SECOND-BRAIN.md` in full at the start of every session and follow it exactly.
It is written tool-neutrally: everything in it applies to Codex, Gemini,
Cursor, and any other agent working in this repo, not just Claude Code.

It defines:

- The knowledge vault layout under `knowledge/`
- The strict frontmatter schema (how to find notes without reading everything)
- The topic vocabulary rules (`knowledge/clusters/_topics.md`)
- Workflows W1–W9: ingestion, clustering, context-driven build, conflict
  detection, reports, issue recurrence, reusable lessons, and issue candidates

## Skill equivalents

Every workflow is a repository skill, paired in `.claude/skills/<name>/`
(Claude Code) and `.agents/skills/<name>/` (Codex) — 14 skills in all: the
13 workflows plus the `second-brain` umbrella router for ambiguous intents.
Invoke as `/name` in Claude Code, `$name` or natural language in Codex.
Each pair's SKILL.md files are kept byte-identical (guarded by
`bin/test.sh`). The legacy `.claude/commands/` and `.codex/prompts/`
surfaces are retired; re-running the installer removes their
marker-bearing leftovers from older installs.

## Session start (applies to every CLI)

Before writing code or making a decision, read `knowledge/clusters/_topics.md`
and the tail of `knowledge/log.md`. If the task touches any topic in that
vocabulary, open `knowledge/clusters/cluster-<topic>.md` first — one file read
gives you the active decisions, superseded decisions, issues, lessons, and key
documents for that topic. See the "세션 시작 컨텍스트" rule in SECOND-BRAIN.md.

Claude Code automates this with a SessionStart hook
(`.claude/hooks/session-context.mjs`, registered in `.claude/settings.json`).
**Codex has an equivalent hook engine, but it only loads hooks from
`~/.codex/hooks.json` or from an installed plugin — never from a file committed
to the repository.** A repo-scoped template therefore cannot register it for
you. On Codex and any other CLI without repo-scoped hooks, follow the rule
yourself: it is not optional just because nothing enforces it.

If no command mechanism is available, plain natural language works: the
workflows in SECOND-BRAIN.md are triggered by intent, not by command names.
"이 회의 전사체 볼트에 넣어줘" must execute workflow W1 fully — including
automatic conflict detection — exactly as `/ingest-meeting` would.

| Intent | Workflow |
|---|---|
| Ingest a meeting transcript | W1 (includes W4 conflict check) |
| Reorganize topic clusters | W2 (full pass includes the integrity check) |
| Implement from vault context | W3 (includes W4 + W6 checks) |
| Check an opinion against past decisions | W4 |
| Generate a report from a given format | W5 |
| Ingest an issue / completion report | W6 |
| Ingest a document (기획서/스펙/아티클) | W7 |
| Find similar past issues | W6 recurrence detection |
| Capture a reusable work rule / lesson | W8 |
| Recall topic context | W3 + W4 + W6 + W8 |
| Maintain the vault | W2 full (integrity check + re-cluster) + W8 |
| File meeting outcomes as tracker issues | W9 (extraction is automatic in W1) |

## Non-negotiables (repeated here for emphasis)

- Never silently overwrite a decision — surface conflicts and ask.
- Never delete decision history — use the supersede chain.
- Keep frontmatter valid and schema-compliant on every write.
- Vault files are the source of truth over chat memory.
- Append every vault write to `knowledge/log.md` (append-only).
- At session start, read `knowledge/clusters/_topics.md` and the tail of
  `knowledge/log.md`, and open the matching cluster note before acting.
