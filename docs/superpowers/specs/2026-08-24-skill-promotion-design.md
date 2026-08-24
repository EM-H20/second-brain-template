# Command-to-Skill Promotion — Design

**Date:** 2026-08-24
**Status:** approved (pending spec review)

## Problem

The 12 workflow entry points live in `.claude/commands/` — a Claude-only
surface. Codex users get one monolithic skill plus deprecated
`.codex/prompts/`. Skills are the strict superset of commands for this
repo's cross-CLI goal: user-invocable (`/name` in Claude Code, `$name` in
Codex), model-invocable via trigger-rich descriptions, and readable by every
CLI that adopts the `.agents/skills` standard. Keeping both surfaces would
double-register `/name`; keeping commands only leaves Codex without
first-class per-workflow entry points.

## Goals

1. Promote all 12 commands to paired skills — `.claude/skills/<name>/SKILL.md`
   ≡ `.agents/skills/<name>/SKILL.md`, byte-identical, extending the parity
   model shipped in the status-lifecycle work.
2. Give each skill a trigger-rich bilingual description — the core
   deliverable: auto-trigger quality is what this promotion buys.
3. Delete the commands from the template and teach `bin/init.js` a
   marker-verified orphan cleanup (hardcoded RETIRED list) so existing
   installs converge on re-run.
4. Retire deprecated `.codex/prompts/` through the same mechanism.
5. Generalize the parity guard and installer/packaging wiring from
   "second-brain only" to "all skills".
6. Update every surface that documents commands: SECOND-BRAIN.md, AGENTS.md,
   README × 4 language blocks, init.js console output.

## Non-Goals

- No workflow content changes — skills stay thin routers that read
  `SECOND-BRAIN.md` and execute the matching W-workflow, exactly as the
  commands do today. Bodies carry over verbatim (including `$ARGUMENTS`).
- No `agents/openai.yaml` for the 12 new skills (umbrella keeps its one).
- No generic SRC-diffing orphan detection — retirement is a hardcoded path
  list; nothing else is ever deleted.
- The `second-brain` umbrella skill stays as the ambiguous-intent router;
  its body is unchanged.
- No changes to the session-start hook or `.claude/settings.json` handling.

## Design

### D1. Skill set and file layout

13 skills, each a byte-identical pair:

```
capture  recall  maintain  ingest-meeting  ingest-doc  ingest-issue
find-similar-issue  check-conflict  cluster  build  report  setup-vault
second-brain (umbrella, existing)
```

For each promoted skill:

- Path: `.claude/skills/<name>/SKILL.md` and `.agents/skills/<name>/SKILL.md`.
- Frontmatter: `name: <name>` plus `description:` built as
  `[existing Korean one-liner] + "Use when …" English trigger prose +
  Korean trigger vocabulary` — the same formula as the umbrella's
  description (e.g. capture carries 기억해, recall carries 꺼내줘,
  maintain carries 정리해; ingest-meeting carries 회의록/전사체; each
  description names the concrete situations that should summon it).
- Body: the former command body verbatim (Read SECOND-BRAIN.md → execute the
  named workflow; `$ARGUMENTS` kept where present).

Invocation after promotion: `/name` (Claude Code exposes user-invocable
skills as slash commands), `$name` or natural language (Codex). Power users
lose nothing; every entry point gains auto-trigger.

### D2. Retirement — marker-verified orphan cleanup (`bin/init.js`)

New hardcoded list:

```js
const RETIRED = [/* 12 × '.claude/commands/<name>.md', 13 × '.codex/prompts/<file>.md' (12 prompts + README.md) */];
```

New plan step `planRetired(rel)` for each entry:

- target does not exist → no-op (silent).
- target exists and contains `ownedMarker(rel)` → plan `{kind: 'retire'}`;
  the analysis summary prints a `정리(구버전 파일): N개` line.
- target exists WITHOUT the marker → the file is the user's own — never
  touched, no warning (there is nothing of ours to install there anymore).

`applyAction` for `retire`: delete the file; afterwards attempt to remove
`.claude/commands`, `.codex/prompts`, and `.codex` if empty (ignore
failures — a user file left behind keeps the directory).

Migration story: re-running the installer converges an old install (removes
the 25 marker-bearing files, resolving the `/name` double-listing). An
install that never re-runs keeps working — the old commands still route to
SECOND-BRAIN.md; the duplication is cosmetic until the next re-run.

### D3. Wiring

- `buildPlan()` dirs array: `['.claude/hooks', '.claude/skills']` — the
  `.claude/commands` and `.codex/prompts` entries are removed. The
  hardcoded `.agents/skills/second-brain` walk becomes a walk of
  `.agents/skills` (all skills).
- `package.json` `files`: `".agents/skills/second-brain"` → `".agents/skills"`;
  remove `".claude/commands"` and `".codex/prompts"`; keep `".claude/skills"`.
- `RETIRED` paths are additionally appended to plan processing after the
  install entries (D2).

### D4. Test rework (`bin/test.sh`)

- Packaging guard array becomes
  `[".claude/hooks", ".claude/settings.json", ".claude/skills", ".agents/skills"]`.
- Parity guard generalizes to a loop: the set of skill directory names under
  `$ROOT/.agents/skills/` and `$ROOT/.claude/skills/` must be equal, each
  pair's SKILL.md must pass `diff -q`, and the count must be 13.
- Case 1 (fresh install): command/prompt installation asserts are replaced
  with skill asserts — existence + marker + frontmatter-intact for
  representative skills, `$ARGUMENTS` grep for capture/recall, and absence
  asserts that `.claude/commands/` and `.codex/prompts/` are NOT created.
- Case 2 (existing project): the user's own `.claude/commands/build.md`
  must still be preserved untouched (this now also proves retirement never
  deletes unmarked files). The old "skip warning printed" assert for
  build.md is removed — commands are no longer template-owned, so no skip
  warning is expected.
- Case 3 (re-run): the stale-content update test moves from
  `.claude/commands/report.md` to a skill file. New retirement scenario:
  plant a marker-bearing fake `.claude/commands/report.md` and
  `.codex/prompts/recall.md`, re-run, assert both are deleted and the
  emptied directories are gone; plant an unmarked user command, re-run,
  assert it survives.
- All SECOND-BRAIN.md / template / types.json asserts are untouched.

### D5. Documentation and console text

- `SECOND-BRAIN.md` trigger-routing intro: "The 9 slash commands remain as
  power-user aliases" → the 12 workflows are individual skills, invocable
  directly (`/name` · `$name`) with the three verbs as the everyday route.
- `AGENTS.md` "Command equivalents" → skill equivalents; drop the
  `.codex/prompts` compatibility sentence.
- `README.md` × 4 language blocks: command-reference section becomes a
  skill reference (invocation column: `/name` Claude · `$name`/natural
  language Codex), structure tree drops `.claude/commands/` and
  `.codex/prompts/` and shows `.claude/skills/` + `.agents/skills/` (13
  skills), cross-CLI section updated.
- `bin/init.js` next-steps output: `/setup-vault` guidance stays valid (it
  is a skill now); the "슬래시 커맨드 12개는 파워유저용 별칭" line becomes a
  skills line.

## Change surface

| File | Change |
|---|---|
| `.claude/skills/<12>/SKILL.md`, `.agents/skills/<12>/SKILL.md` | new — 24 files, 12 identical pairs |
| `.claude/commands/*.md` (12), `.codex/prompts/*` (13) | deleted from template |
| `bin/init.js` | dirs array, `.agents/skills` walk, RETIRED list + planRetired/apply, output text |
| `package.json` | `files` rewiring |
| `bin/test.sh` | packaging guard, parity loop, case 1/2/3 rework, retirement scenario |
| `SECOND-BRAIN.md` | trigger-routing wording |
| `AGENTS.md` | skill equivalents section |
| `README.md` | 4 language blocks: skill reference, tree, cross-CLI |

CHANGELOG follows the existing release automation.

## Testing

`bash bin/test.sh` remains the single harness; every behavioral change above
lands with its assert in the same task (TDD: assert first, then implement).
The retirement scenario is the critical new coverage — it proves the
installer deletes exactly the 25 marker-bearing paths and nothing else.
