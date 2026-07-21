---
description: 볼트의 결정·회의·이슈를 컨텍스트로 모아 브리프를 만들고, 설치된 하네스 워크플로우로 구현을 진행
---

Implement based on vault knowledge, per CLAUDE.md workflow W3.

Input: $ARGUMENTS (what to build; if empty, ask).

Steps:
1. Identify relevant topics for the request via
   `knowledge/clusters/_topics.md` and frontmatter scan.
2. Collect: ACTIVE decisions (cite DEC ids), the latest meeting context,
   open AND resolved issues on those topics.
3. Conflict check (W4): does the request contradict any active decision?
   If yes → stop and ask per W4 format.
4. Recurrence check (W6): do past issues look related? If yes, surface them
   (ISS id, root cause, fix) before writing any code.
5. Present a **Context Brief** in chat: goal / constraints from decisions
   (with ids) / relevant past issues / open questions.
6. Proceed to implementation. If a development-methodology harness
   (Superpowers, ECC, etc.) is active in this project, follow ITS workflow
   from here (brainstorm/plan/TDD as it dictates) — the brief is its input.
   Do not bypass the harness.
