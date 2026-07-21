---
description: 이슈 또는 완료 리포트 파일을 지식화해 issues/에 저장 (재발 탐지의 재료)
---

Ingest an issue or a completion report, per SECOND-BRAIN.md workflow W6.

Input: $ARGUMENTS (file path or pasted content; if empty, ask. Also determine:
is this a NEW issue, or a COMPLETION report closing an existing one?).

For a new issue:
1. Create from `knowledge/_templates/issue.md` (next ISS-NNNN).
2. Extract `symptoms` keywords with care — concrete, greppable terms
   (error names, module names, observable behavior). These are the future
   retrieval keys.
3. Before saving, run recurrence detection: grep existing `issues/`
   frontmatter for overlapping symptoms/topics. If a similar PAST issue
   exists, tell the user immediately — it may already be solved.

For a completion report:
1. Identify the issue it closes (ask if ambiguous).
2. Create from `knowledge/_templates/completion-report.md` with the SAME
   ISS id; fill 해결 방법 / 근본 원인 / 재발 방지 / 교훈.
3. Update the original issue: `status: resolved`, `root_cause` one-liner,
   `resolution` wikilink.
4. Update related cluster notes.
