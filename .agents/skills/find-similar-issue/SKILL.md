---
name: find-similar-issue
description: 현재 문제와 유사한 과거 이슈를 볼트에서 찾아 원인·해결책을 제시. Use when debugging or hitting an error to check whether the vault has seen it before — matches symptoms and topics, then surfaces the past root cause and fix. Triggers include 비슷한 이슈, "전에도 이런 일 있었나", and recurring-bug checks.
---

Read `SECOND-BRAIN.md` completely, then execute W6 recurrence detection and
its General rules.

Input: $ARGUMENTS (current symptoms or error message; if empty, ask).

Search frontmatter first and open only plausible matches.
