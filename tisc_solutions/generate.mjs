// Generates one solution folder per TISC challenge (prefix "N_slug") plus a root index.
// Idempotent: never overwrites an existing README.md in a solution folder, so hand-written
// deep plans (e.g. 13_personalized-billing-assistance) survive re-runs.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const challenges = [
  ...JSON.parse(readFileSync(path.join(root, "data", "challenges_1_9.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(root, "data", "challenges_10_18.json"), "utf8")),
];

const KEY_DATES = [
  ["29 Oct 2026", "Challenge launch (live)"],
  ["20 Nov 2026", "Applications close"],
  ["1 Dec 2026", "Demo Day, T-Hub campus, Hyderabad"],
  ["7–9 Dec 2026", "Startup Showcase (curtain raiser to Invest Telangana Global Summit 2026)"],
];

const APPLY_URL =
  "https://forms.zohopublic.com/THub/form/TISC2026ApplicationForm/formperma/_CRTCzpyPqvGiThE5TOeJDwicYaGJpup0OFe4XC1eLc";

function stub(c) {
  const folder = `${c.num}_${c.slug}`;
  return `# Challenge ${c.num} — ${c.title}

> Telangana Innovation Startup Challenge (TISC) 2026 · source: https://tisc.telangana.gov.in/#challenges

**Sector:** ${c.sector.split(",")[0].trim()}
**Departments:** ${c.sector}
**Impact statement:** ${c.impact}

## Problem Statement

${c.problem}

## Solution Sought (official)

${c.solution}

## Expected Impact (official)

${c.expectedImpact}

## Status

- [ ] Problem framing and department clarification
- [ ] Data availability confirmed (what the departments can actually give us)
- [ ] Approach chosen, baseline defined
- [ ] Prototype / demo build
- [ ] Application submitted via the TISC form
- [ ] Demo Day deck prepared (1 Dec 2026, T-Hub)

## Working notes

_Add your analysis here: constraints, data sources, architecture, evaluation metrics._

## Key dates

| Date | Milestone |
| --- | --- |
${KEY_DATES.map(([d, m]) => `| ${d} | ${m} |`).join("\n")}

**Application:** [TISC 2026 application form](${APPLY_URL}) — evaluation is on feasibility, innovation, affordability, scalability and public impact. Exact requirements for each challenge are subject to departmental confirmation.
`;
}

function index() {
  const rows = challenges.map(
    (c) => `| ${c.num} | [${c.title}](${c.num}_${c.slug}/README.md) | ${c.sector} | ${c.impact} |`,
  );
  return `# TISC 2026 — Telangana Innovation Startup Challenge

Solution folders for the 18 real-world challenges published at
[https://tisc.telangana.gov.in/#challenges](https://tisc.telangana.gov.in/#challenges).
One folder per challenge, named \`N_solution-name\`.

**Active focus: [Challenge 13 — Personalized Billing Assistance](13_personalized-billing-assistance/README.md).**

| # | Challenge | Departments | Impact |
| --- | --- | --- | --- |
${rows.join("\n")}

## Key dates

- **29 Oct 2026** — challenge launch (live)
- **20 Nov 2026** — applications close
- **1 Dec 2026** — Demo Day, T-Hub campus, Hyderabad
- **7–9 Dec 2026** — Startup Showcase, curtain raiser to Invest Telangana Global Summit 2026

## Evaluation criteria

Feasibility · innovation · affordability · scalability · public impact.
Startups at any stage, individual innovators/entrepreneurs, and student & university research teams can apply; software (AI/IT) and hardware innovations are both accepted. Exact requirements per challenge are subject to departmental confirmation.

**Apply:** [TISC 2026 application form](${APPLY_URL}) · contact tisc@telangana.gov.in
`;
}

let created = 0;
for (const c of challenges) {
  const dir = path.join(root, `${c.num}_${c.slug}`);
  mkdirSync(dir, { recursive: true });
  const readme = path.join(dir, "README.md");
  if (existsSync(readme)) continue;
  writeFileSync(readme, stub(c), "utf8");
  created++;
}

writeFileSync(path.join(root, "README.md"), index(), "utf8");
console.log(`folders: ${challenges.length}, stubs written: ${created}`);
for (const c of challenges) console.log(`${c.num}_${c.slug}`);
