---
description: 회의 전사체(.md/텍스트)를 구조화해 볼트에 저장하고, 결정 분리·클러스터 갱신·충돌 검사를 수행
---

Ingest a meeting transcript into the knowledge vault. Follow CLAUDE.md
workflow W1 exactly.

Input: $ARGUMENTS (a file path, or if empty, ask the user to paste the
transcript or give a path).

Steps:
1. Read the transcript.
2. Read `knowledge/clusters/_topics.md` (topic vocabulary).
3. Scan frontmatter of existing notes in `knowledge/meetings/` and
   `knowledge/decisions/` on overlapping topics.
4. Create the meeting note from `knowledge/_templates/meeting-note.md`
   at `knowledge/meetings/YYYY-MM-DD-<slug>.md`.
5. For each decision in the meeting: run conflict detection (W4) against
   ACTIVE decisions first. If conflict → stop and ask per W4 before saving.
   Otherwise create the decision note (next DEC-NNNN).
6. Update cluster notes for the touched topics (create from
   `_templates/cluster-index.md` if new; update `_topics.md` if a new slug
   was needed).
7. Report back: note paths created, decisions extracted (ids), clusters
   updated, any conflicts found and how they were resolved.
