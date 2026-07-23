# Changelog

All notable feature/fix/perf changes, generated from git history by `bin/changelog.js`.

## [v1.2.3] — 2026-07-23

### Fixes

- replace vault self-loop with dedicated upkeep node (root cause of mermaid label clipping)

## [v1.1.4] — 2026-07-22

### Features

- add capture/recall/maintain trigger commands
- add 관련 교훈 section to cluster template
- add W8 lesson workflow and 3-trigger routing to SECOND-BRAIN.md
- document lesson note type in SECOND-BRAIN.md schema
- add lesson note template and folder skeleton

## [v1.1.2] — 2026-07-22

### Features

- refresh knowledge scaffolding on re-run with .bak backup

### Fixes

- surface .bak backups in installer output, fix stale README, add regression tests

## [v1.1.0] — 2026-07-22

### Features

- source-preservation workflow rule and docs
- add source field to meeting/issue/completion/doc schemas
- _sources/ skeleton for original preservation, exclude from graph

## [v1.0.3] — 2026-07-21

### Fixes

- cite DOC ids in W3 brief, clarify doc-supersede and members semantics

## [v1.0.2] — 2026-07-21

### Features

- /ingest-doc command (claude + codex) and README docs
- W7 document ingestion workflow with authority/relevance weighting
- docs/ vault section, doc template, graph colors, gitignore fix
- analyze project and confirm y/n before install
- installer conflict merge + idempotent re-run (marker safety)
- npx installer — fresh install path

### Fixes

- use annotated tag so --follow-tags actually pushes the release tag
- point payload docs at SECOND-BRAIN.md, test append idempotency

