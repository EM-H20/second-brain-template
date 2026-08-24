---
name: ingest-issue
description: 이슈 또는 완료 리포트 파일을 지식화해 issues/에 저장 (재발 탐지의 재료). Use when the input is an issue writeup or a completion report — extracts symptom keywords for future recurrence detection and closes issues with cross-links. Triggers include 이슈 기록해, 완료 리포트, postmortem, and troubleshooting-record ingestion.
---

Read `SECOND-BRAIN.md` completely, then execute W6 and its General rules.

Input: $ARGUMENTS (file path or pasted content; if empty, ask).

Determine whether this is a new issue or a completion report. Ask when the
type or the issue being closed is ambiguous.
