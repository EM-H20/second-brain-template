
Find similar past issues, per SECOND-BRAIN.md workflow W6 recurrence detection.

Input: $ARGUMENTS (description of the current problem / error message;
if empty, ask).

Steps:
1. Extract symptom keywords from the input (error names, module names,
   observable behavior).
2. Grep `knowledge/issues/` frontmatter for overlapping `symptoms` and
   `topics`. Rank by overlap.
3. Open only the top matches; compare root causes with the current problem.
4. Report per match: ISS id, then/now symptom comparison, root cause,
   how it was resolved (from the completion report), and your judgment on
   whether the same fix applies here.
5. No match → say so explicitly, and offer to open a new issue via
   /ingest-issue so this one becomes knowledge for next time.
