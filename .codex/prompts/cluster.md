
Run a FULL clustering pass per CLAUDE.md workflow W2.

Steps:
1. Grep the YAML frontmatter of every note under `knowledge/` (do not read
   full bodies yet).
2. Build the topic → notes mapping. Identify near-duplicate topic slugs
   (e.g. `auth` / `authentication`); propose merges to the user before
   applying, then retag affected notes and update
   `knowledge/clusters/_topics.md`.
3. Rebuild every `knowledge/clusters/cluster-<topic>.md`: current-state
   summary, active vs superseded decisions, meeting timeline, related issues.
   Open note bodies only where needed for accurate summaries.
4. Report: clusters rebuilt, topics merged, orphan notes (no topics) that
   need tagging.
