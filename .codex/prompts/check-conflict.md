
Check a new opinion/decision against the vault, per CLAUDE.md workflow W4.

Input: $ARGUMENTS (the new opinion/decision; if empty, ask).

Steps:
1. Extract the topics of the input; scan `knowledge/decisions/` frontmatter
   for ACTIVE decisions on those topics.
2. Open matching decision notes; compare substance, not wording.
3. No conflict → say so, list the aligned decisions (ids) it's consistent with.
4. Conflict → present in the W4 format:
   기존(id, 날짜, 요약) vs 신규(요약), then ask:
   기존 유지 / 신규로 대체 / 둘 다 조건부 유지.
5. Apply the user's choice per W4 resolution rules (supersede chain; never
   delete history).
