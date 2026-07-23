# Changelog Automation — Design

**Date:** 2026-07-23
**Status:** approved (pending spec review)

## Problem

The template repo auto-releases a new version on every push to `main`
(`version-bump.yml`: `feat:` → minor, else patch). There is no place to see
**what changed per version** — the release history is only implicit in git
tags and commit messages. The maintainer wants a viewable, per-version
changelog, linked from the README.

Two hard constraints:
1. **Real automation** — no manual curation step. The changelog updates itself
   on release.
2. **Not shipped to user projects** — when someone `npx`-installs the template,
   none of this version machinery may leak into their project.

## Goals

- Auto-generate `CHANGELOG.md` at the repo root from git history on every
  release, grouped by version, newest first.
- Filter noise: skip release/merge/non-conventional commits, and **omit
  versions whose only changes are docs/chore** (kills the many trivial patch
  releases like v1.1.3/4/5).
- Link it from the README (`## 📜 변경 내역`) in all four language sections.
- Guarantee `CHANGELOG.md` is excluded from `npx` installs (structurally, and
  asserted by a regression test).

## Non-Goals

- No third-party changelog tool (git-cliff, conventional-changelog, semantic-
  release). Keeps the repo's zero-dependency identity — the generator is
  stdlib-only Node, and it runs in CI, never in the shipped package.
- No version fields on the vault's `issue` schema. This is the template repo's
  own release history, not an end-user vault feature.
- No changelog for user projects.

## Approach

A stdlib-only Node generator, `bin/changelog.js`, run as a CI step inside the
existing `version-bump.yml` release job. It **fully rebuilds** `CHANGELOG.md`
from git tags + commits every release (idempotent — no incremental drift).

Why hand-rolled over git-cliff: this repo's history is clean and controlled
(CI makes the release commits; contributors use conventional prefixes), so the
parsing surface is small. A tool built for messy histories is over-powered
here, and the existing CI already does its git work by hand in bash — a
generator in the same spirit fits, adds no action to pin or audit, and honors
the "understand every line, zero deps" pitch the template makes to its users.

### Data flow

```
push to main
  → version-bump job (existing): compute NEW version (npm version --no-git-tag-version)
  → NEW step: node bin/changelog.js --new "$NEW"   # rebuilds CHANGELOG.md
  → git add package.json CHANGELOG.md
  → commit "chore(release): $NEW", tag, push --follow-tags   (existing)
```

`bin/changelog.js` at generation time (the new tag does not exist yet):
1. Read all existing tags, sorted by semver descending
   (`git tag --sort=-v:refname`).
2. Treat commits from the latest existing tag to `HEAD` as belonging to the
   pending `--new` version (dated from `HEAD`'s commit date).
3. For each version range, read `git log --no-merges --format=...` and parse
   each subject as `type(scope): subject`.
4. Bucket by type; **skip a version entirely if it has no `feat`/`fix`/`perf`
   commits**; drop `chore(release):` and non-conventional subjects.
5. Render Keep-a-Changelog-style Markdown, newest first, each version headed
   `## [vX.Y.Z] — YYYY-MM-DD` (date from the tag's / HEAD's commit date — no
   wall-clock, fully reproducible).
6. Overwrite `CHANGELOG.md`.

### Module shape (isolation)

Pure functions (unit-testable with synthetic input, no git needed):
- `parseCommit(subject) → { type, scope, subject } | null` — null for
  non-conventional or `chore(release):`/merge subjects.
- `bucket(commits) → { feat: [...], fix: [...], perf: [...] }`.
- `renderVersion({ version, date, buckets }) → string` — one version section;
  returns `""` when no feat/fix/perf (signals skip).
- `render(versions) → string` — the whole file, joined newest-first.

Thin I/O layer (shells out to `git`), and a `--selfcheck` mode that runs
`parseCommit`/`bucket`/`renderVersion` over hard-coded fixtures and asserts the
output — the one runnable check the logic leaves behind.

Buckets shown: `feat` → **Features**, `fix` → **Fixes**, `perf` →
**Performance**. `docs`/`chore`/`refactor`/`test`/`ci` are intentionally
dropped from the output (they are the noise). A constant near the top of the
file (`SHOWN_TYPES`) makes this list the single point of change.

## CI integration

`version-bump.yml` changes:
- `actions/checkout@v4` needs `with: { fetch-depth: 0 }` — the default shallow
  clone has neither full history nor tags, so the generator would see nothing.
- Add one step after the version is computed and before the commit:
  `node bin/changelog.js --new "$NEW"`.
- Add `CHANGELOG.md` to the `git add` line.
The `if: !startsWith(... 'chore(release):')` guard already prevents the release
commit from retriggering the job — unchanged.

## README

Add a one-line link in each of the four language sections (EN/ZH/JA/KO), near
the command reference or structure section:
`## 📜 [Changelog](CHANGELOG.md)` (localized heading). No generated content is
embedded in the README — it only links out, so nothing there needs updating on
release.

## npx exclusion

The installer (`bin/init.js`) only scaffolds `.claude/commands/`,
`.codex/prompts/`, `knowledge/`, `SECOND-BRAIN.md`, `CLAUDE.md`, `AGENTS.md`.
`CHANGELOG.md` (root) and `bin/` are outside that set, so they are never
installed — same exclusion that already keeps `README.md`, `docs/`, and
`package.json` out of user projects. A regression test asserts it.

## Files touched

- `bin/changelog.js` — CREATE. Stdlib Node generator + `--selfcheck`.
- `.github/workflows/version-bump.yml` — MODIFY. `fetch-depth: 0`, changelog
  step, `git add CHANGELOG.md`.
- `CHANGELOG.md` — CREATE (first generation; committed seed acceptable).
- `README.md` — MODIFY. Changelog link in all 4 language sections.
- `bin/test.sh` — MODIFY. Assert `CHANGELOG.md` is NOT installed into a target
  (`[ ! -f CHANGELOG.md ]` in 케이스 1), and run
  `node bin/changelog.js --selfcheck` as a harness step.
- `package.json` — MODIFY (optional). Add `"changelog": "node bin/changelog.js"`
  script for local runs. No dependencies added.

## Testing

- `bin/changelog.js --selfcheck` — asserts `parseCommit` classifies
  conventional/`chore(release):`/non-conventional subjects correctly and that a
  docs-only version renders to `""` (skipped). Wired into `bin/test.sh`.
- `bin/test.sh` gains the exclusion assertion so a future installer change that
  accidentally scaffolds root files is caught.
- Manual verification: run `node bin/changelog.js --new vX.Y.Z` locally on the
  real repo and confirm the noise versions (docs-only patches) are absent and
  the feat/fix history reads correctly.

## Open questions

None blocking. Whether to also surface `docs` under a collapsed "Maintenance"
group can be decided during planning (default: omit — that is the noise we set
out to remove).
