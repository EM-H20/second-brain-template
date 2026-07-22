Gather vault context on a topic, per SECOND-BRAIN.md workflow W3 — the
"recall" trigger.

Input: the topic or task below (if empty, ask).

Steps:
1. Collect active decisions (official → internal → external), latest meeting
   context, relevant docs (`topics` first, `topics_ref` as reference),
   open/resolved issues (W6), and relevant lessons — grep `lessons/`
   frontmatter for matching `trigger`/`topics` (W8).
2. Run conflict detection (W4) against active decisions.
3. Write a Context Brief in chat: goal, constraints (DEC ids), docs (DOC ids
   + authority), past issues (ISS ids), 관련 교훈 (LSN ids), open questions.
