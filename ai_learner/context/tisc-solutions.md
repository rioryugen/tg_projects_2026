# TISC 2026 solution folders (d:\git\tg_projects\tisc_solutions)

- Source: https://tisc.telangana.gov.in/#challenges — 18 challenges, scraped via browser DOM (`article.challenge`, id `challenge-N`).
- Layout: one folder per challenge named `N_slug`; root `README.md` is the index; raw data in `data/challenges_1_9.json` + `data/challenges_10_18.json` (fields: num, title, slug, sector, summary, impact, problem, solution, expectedImpact).
- `generate.mjs` regenerates stubs **idempotently**: existing README.md is never overwritten, so hand-written plans survive re-runs. Run from any cwd (`root` resolves from script location = tisc_solutions itself).
- Departments live in the single `sector` field (there is no separate `depts`).
- Active focus: challenge 13 (`13_personalized-billing-assistance`) — deep plan in `PLAN.md`, README links to it. Key principle there: deterministic tariff math + LLM only for Telugu rendering; numeric verifier enforces faithfulness.
- Dates: launch 29 Oct 2026, applications close 20 Nov 2026, Demo Day 1 Dec 2026 at T-Hub. Application = Zoho form (link in README).
- Node system-wide v24 works for this script; portable node22 is only needed for REA.
