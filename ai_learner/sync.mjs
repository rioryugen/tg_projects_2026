// Refreshes the local skills + context store in ai_learner from canonical sources.
// Idempotent: a file is copied only when it differs (size, then mtime), so re-runs are cheap.
// Never touches context/ — that layer is hand-maintained.

import { statSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ws = path.dirname(here);

const jobs = [
  { src: path.join(ws, ".github", "skills"), dest: path.join(here, "skills") },
  { src: path.join(ws, "integrations", "hf-papers"), dest: path.join(here, "papers"), files: ["papers.jsonl", "INDEX.md"] },
  { src: path.join(ws, "tisc_solutions", "data"), dest: path.join(here, "data") },
];

function differs(a, b) {
  if (!existsSync(b)) return true;
  const sa = statSync(a), sb = statSync(b);
  return sa.size !== sb.size || sa.mtimeMs > sb.mtimeMs + 1000;
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let copied = 0, skipped = 0;
for (const job of jobs) {
  if (!existsSync(job.src)) { console.log(`skip missing source: ${job.src}`); continue; }
  const files = job.files
    ? job.files.map((f) => path.join(job.src, f)).filter((f) => existsSync(f))
    : walk(job.src);
  for (const src of files) {
    const dest = path.join(job.dest, path.relative(job.src, src));
    mkdirSync(path.dirname(dest), { recursive: true });
    if (!differs(src, dest)) { skipped++; continue; }
    copyFileSync(src, dest);
    copied++;
  }
}

console.log(`copied: ${copied}, unchanged: ${skipped}`);
