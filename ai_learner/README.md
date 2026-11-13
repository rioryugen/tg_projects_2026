# ai_learner — local skills + context store

Self-contained snapshot of the skills and working context used in this workspace, kept on disk here so it survives tool unavailability, offline work, and session resets. Refresh with `node sync.mjs` (idempotent).

## Layout

```
ai_learner/
  README.md            this file
  sync.mjs             refreshes skills/, papers/, data/ from canonical sources
  skills/              SKILL.md per skill folder (workspace .github/skills + humanizer)
  context/           hand-maintained knowledge notes (verbatim copies of repo memory)
  papers/            HF Daily Papers corpus: papers.jsonl + INDEX.md
  data/              TISC challenge JSON (canonical source in tisc_solutions/data)
```

## What each part is

- **skills/** — every skill folder from `.github/skills` copied verbatim (`<name>/SKILL.md`). Includes `humanizer` (from `integrations/humanizer`, installed per its README). These are the reusable procedures: TDD, review, browser QA, humanizing prose, etc.
- **context/** — the durable facts about this workspace: integrations installs and gotchas, TISC solution-folder conventions, HF integration specifics. Verbatim copies of `/memories/repo/*`. Update here first when a fact changes, then mirror into memory.
- **papers/** — Hugging Face Daily Papers corpus (normalized JSONL + top-papers index), copied from `integrations/hf-papers`. Canonical raw per-day responses stay in `integrations/hf-papers/data/daily/`.
- **data/** — the 18 TISC challenge records as JSON, copied from `tisc_solutions/data/`.

## Refresh

```powershell
cd d:\git\tg_projects\ai_learner
node sync.mjs
```

The script re-copies skills, papers, and data from their canonical locations. It skips files that are already identical (mtime + size compare), reports what changed, and never deletes hand-written context. `context/` is intentionally not synced — it's the human-maintained layer.

## Using it as retrieval context

- Grep `skills/` for a procedure before inventing one; the SKILL.md frontmatter has name/description.
- `papers/papers.jsonl` is greppable by keyword, title, org, upvotes (`jq` or PowerShell `ConvertFrom-Json`).
- `context/` answers "how was this set up / where does this live" without re-exploring the workspace.
