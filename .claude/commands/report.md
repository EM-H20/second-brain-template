---
description: 사용자가 준 양식에 맞춰 볼트 내용을 근거로 보고서를 작성해 reports/에 저장
---

Generate a report per SECOND-BRAIN.md workflow W5.

Input: $ARGUMENTS (format file path and/or scope, e.g. period or topics;
if unclear, ask for BOTH the format and the scope).

Steps:
1. Load the user's format (file or described structure). If none exists yet,
   ask for it — do not invent a format.
2. Gather source notes for the scope via frontmatter scan (meetings,
   decisions, issues in range/topics).
3. Fill the format strictly from vault content. Cite DEC/ISS ids inline
   where the format allows. Missing info → state it's missing; never invent.
4. Save to `knowledge/reports/YYYY-MM-DD-<slug>.md` with `type: report`
   frontmatter, and show the user the result.
