---
name: cluster
description: 볼트 전체를 재스캔해 무결성을 검사하고 주제 클러스터를 재구성 + 중복 토픽 병합. Use for a full W2 pass over the vault — integrity findings, review candidates, cluster rebuild, topic merges. Triggers include 클러스터 재구성, 재스캔, and full vault rescan requests.
---

Read `SECOND-BRAIN.md` completely, then execute a full W2 pass and its General
rules.

Run the integrity check first and report every finding with its file path and
reason — broken frontmatter, dead wikilinks, asymmetric supersede chains, id
collisions, unknown topic slugs, cluster/index drift, missing source files.
Fix nothing without approval.

Then propose topic merges before applying them. Rebuild every cluster section,
including documents and lessons, and update `knowledge/index.md` when needed.
