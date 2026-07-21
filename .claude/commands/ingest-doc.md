---
description: 기획서·스펙·리서치·아티클 등 일반 문서를 지식화해 docs/에 저장 (권위·연관 가중치 + 결정 추출)
---

Ingest a document per SECOND-BRAIN.md workflow W7.

Input: $ARGUMENTS (file path or pasted content; if empty, ask).

1. Determine `doc_type` (spec/prd/design/research/article/other) and
   `authority` (official/internal/external). Ask if ambiguous — never
   guess authority.
2. Create from `knowledge/_templates/doc.md` (next DOC-NNNN): summary,
   key points, open questions, source reference.
3. official/internal only: extract decisions into DEC notes — run
   conflict detection (W4) BEFORE saving each one, link both ways.
   external documents → 논점만, no decisions.
4. Weight topics: core → `topics`, peripheral → `topics_ref`
   (vocabulary per `clusters/_topics.md`).
5. Update matching cluster notes: "핵심 문서" / "참고 문서" sections.
6. Link related meetings/decisions/issues; append one line to
   `knowledge/log.md`.
