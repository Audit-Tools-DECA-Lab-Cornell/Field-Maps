#!/usr/bin/env node
// Keeps the production plan's files in sync: every task ID is defined once, in the file that
// owns its prefix, with a valid Status line, and every ID referenced anywhere is defined.
// Run from any directory: `node docs/plan/check-plan.mjs` (or `pnpm plan:check` at the root).

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Prefix → the one file allowed to define tasks with it.
const owners = {
  CON: "docs/plan/contracts.md",
  SYNC: "docs/plan/sync-powersync.md",
  OPS: "docs/plan/operations.md",
  QA: "docs/plan/verification.md",
  DB: "supabase/PLAN.md",
  BE: "backend/PLAN.md",
  MOB: "mobile/PLAN.md",
  WEB: "web/PLAN.md",
  GIS: "qgis/PLAN.md",
};
const files = [
  ...new Set([
    "docs/plan/README.md",
    "docs/plan/product.md",
    "docs/plan/architecture.md",
    "docs/plan/decisions.md",
    ...Object.values(owners),
  ]),
];
const statuses = ["todo", "doing", "done", "blocked", "dropped"];
const idPattern = new RegExp(`\\b(${Object.keys(owners).join("|")})-(\\d{2})\\b`, "g");
const headingPattern = new RegExp(`^### (${Object.keys(owners).join("|")})-(\\d{2})\\b`);

const problems = [];
const defined = new Map(); // id → file
const counts = Object.fromEntries(statuses.map((s) => [s, 0]));
const referenced = new Map(); // id → Set(file)

for (const file of files) {
  let text;
  try {
    text = readFileSync(join(root, file), "utf8");
  } catch {
    problems.push(`${file}: missing plan file`);
    continue;
  }
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const heading = line.match(headingPattern);
    if (heading) {
      const id = `${heading[1]}-${heading[2]}`;
      if (defined.has(id)) problems.push(`${id}: defined in ${defined.get(id)} and ${file}`);
      defined.set(id, file);
      if (owners[heading[1]] !== file)
        problems.push(`${id}: defined in ${file}, but ${heading[1]}-* belongs to ${owners[heading[1]]}`);
      const next = lines.slice(index + 1, index + 4).find((l) => l.startsWith("Status:"));
      const status = next?.match(/^Status:\s*([a-z]+)/)?.[1];
      if (!status) problems.push(`${id} (${file}:${index + 1}): no "Status:" line under the heading`);
      else if (!statuses.includes(status))
        problems.push(`${id} (${file}:${index + 1}): unknown status "${status}"`);
      else counts[status] += 1;
    }
    for (const match of line.matchAll(idPattern)) {
      const id = `${match[1]}-${match[2]}`;
      if (!referenced.has(id)) referenced.set(id, new Set());
      referenced.get(id).add(file);
    }
  });
}

for (const [id, where] of referenced)
  if (!defined.has(id)) problems.push(`${id}: referenced in ${[...where].join(", ")} but never defined`);

const summary = statuses.map((s) => `${counts[s]} ${s}`).join(", ");
if (problems.length > 0) {
  console.error(`Plan check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Plan check passed: ${defined.size} tasks across ${files.length} files (${summary}).`);
console.log(`Root: ${relative(process.cwd(), root) || "."}`);
