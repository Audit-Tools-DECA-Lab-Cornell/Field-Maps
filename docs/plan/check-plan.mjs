#!/usr/bin/env node
// Keeps the production plan's files in sync. It fails when:
// - an ID is referenced anywhere but never defined, or is defined twice or outside the file
//   that owns its prefix;
// - a task heading is not followed directly by a valid `Status:` line;
// - `Depends:` and `Blocks:` disagree (X blocks Y exactly when Y depends on X);
// - a task depends on a dropped task, on a task scheduled in a later phase, or on itself
//   through a cycle;
// - the README phase board omits a task or lists it under a different phase than its own.
// Run from any directory: `node docs/plan/check-plan.mjs` (or `pnpm plan:check` at the root).
//
// `Depends:` is the source of truth. `Blocks:` is derived from it: run with `--fix` (or
// `pnpm plan:check --fix`) to rewrite every task's `Blocks:` field, then check again.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
const index = "docs/plan/README.md";
const files = [
	...new Set([
		index,
		"docs/plan/product.md",
		"docs/plan/architecture.md",
		"docs/plan/decisions.md",
		...Object.values(owners),
	]),
];
const statuses = ["todo", "doing", "done", "blocked", "dropped"];
const prefixes = Object.keys(owners).join("|");
const idPattern = new RegExp(`\\b(${prefixes})-(\\d{2,})\\b`, "g");
const headingPattern = new RegExp(`^### (${prefixes})-(\\d{2,})\\b`);
const POST_PILOT = 9;

const fix = process.argv.includes("--fix");
const problems = [];
const tasks = new Map(); // id → { file, line, status, phase, depends, blocks }
const referenced = new Map(); // id → Set(file)
const texts = new Map();

const idsIn = (segment) => [...(segment ?? "").matchAll(idPattern)].map((m) => `${m[1]}-${m[2]}`);
const field = (line, name) => {
	const part = line.split(" · ").find((p) => p.trim().startsWith(`${name}:`));
	return part?.slice(part.indexOf(":") + 1);
};

for (const file of files) {
	let text;
	try {
		text = readFileSync(join(root, file), "utf8");
	} catch {
		problems.push(`${file}: missing plan file`);
		continue;
	}
	texts.set(file, text);
	const lines = text.split("\n");
	lines.forEach((line, i) => {
		const heading = line.match(headingPattern);
		if (heading) {
			const id = `${heading[1]}-${heading[2]}`;
			const where = `${file}:${i + 1}`;
			if (tasks.has(id)) problems.push(`${id}: defined in ${tasks.get(id).file} and ${file}`);
			if (owners[heading[1]] !== file)
				problems.push(`${id}: defined in ${file}, but ${heading[1]}-* belongs to ${owners[heading[1]]}`);
			const statusLine = lines[i + 1] ?? "";
			const status = statusLine.match(/^Status:\s*([a-z]+)/)?.[1];
			if (!status) problems.push(`${id} (${where}): the line after the heading must be "Status: …"`);
			else if (!statuses.includes(status)) problems.push(`${id} (${where}): unknown status "${status}"`);
			const phaseText = field(statusLine, "Status") ?? "";
			const phaseMatch = statusLine.match(/· Phase (\d)/);
			const phase = /Post-pilot/.test(statusLine) ? POST_PILOT : phaseMatch ? Number(phaseMatch[1]) : null;
			if (status && status !== "dropped" && phase === null)
				problems.push(`${id} (${where}): no "Phase N" or "Post-pilot" on the Status line ${phaseText}`);
			if (status && status !== "dropped" && !/· Depends:/.test(statusLine))
				problems.push(`${id} (${where}): no "Depends:" on the Status line`);
			tasks.set(id, {
				file,
				line: i + 1,
				status,
				phase,
				depends: idsIn(field(statusLine, "Depends")),
				blocks: idsIn(field(statusLine, "Blocks")),
			});
		}
		for (const match of line.matchAll(idPattern)) {
			const id = `${match[1]}-${match[2]}`;
			if (!referenced.has(id)) referenced.set(id, new Set());
			referenced.get(id).add(file);
		}
	});
}

for (const [id, where] of referenced)
	if (!tasks.has(id)) problems.push(`${id}: referenced in ${[...where].join(", ")} but never defined`);

// With --fix, derive every Blocks field from the Depends fields and rewrite the files.
if (fix) {
	const order = (a, b) => {
		const [pa, na] = a.split("-");
		const [pb, nb] = b.split("-");
		return pa === pb ? Number(na) - Number(nb) : pa.localeCompare(pb);
	};
	const derived = new Map([...tasks.keys()].map((id) => [id, []]));
	for (const [id, task] of tasks) for (const dep of task.depends) derived.get(dep)?.push(id);
	for (const file of new Set([...tasks.values()].map((t) => t.file))) {
		const lines = texts.get(file).split("\n");
		for (const [id, task] of tasks) {
			if (task.file !== file) continue;
			const blocks = derived.get(id).sort(order);
			const line = lines[task.line];
			if (!line?.startsWith("Status:")) continue;
			const value = blocks.length ? blocks.join(", ") : "none";
			lines[task.line] = / · Blocks:/.test(line)
				? line.replace(/ · Blocks:.*$/, ` · Blocks: ${value}`)
				: `${line} · Blocks: ${value}`;
			task.blocks = blocks;
		}
		const next = lines.join("\n");
		if (next !== texts.get(file)) {
			writeFileSync(join(root, file), next);
			texts.set(file, next);
			console.log(`Rewrote Blocks fields in ${file}`);
		}
	}
}

// Depends and Blocks must say the same thing from both ends.
for (const [id, task] of tasks) {
	for (const dep of task.depends) {
		const other = tasks.get(dep);
		if (!other) continue;
		if (dep === id) problems.push(`${id}: depends on itself`);
		if (!other.blocks.includes(id)) problems.push(`${id} depends on ${dep}, but ${dep} does not list ${id} under Blocks`);
		if (other.status === "dropped") problems.push(`${id} depends on ${dep}, which is dropped`);
		if (task.phase !== null && other.phase !== null && other.phase > task.phase)
			problems.push(`${id} (phase ${task.phase}) depends on ${dep}, scheduled later (phase ${other.phase})`);
	}
	for (const blocked of task.blocks) {
		const other = tasks.get(blocked);
		if (other && !other.depends.includes(id))
			problems.push(`${id} blocks ${blocked}, but ${blocked} does not list ${id} under Depends`);
	}
}

// No cycles through Depends.
const state = new Map();
const visit = (id, path) => {
	if (state.get(id) === "done") return;
	if (state.get(id) === "open") {
		problems.push(`dependency cycle: ${[...path.slice(path.indexOf(id)), id].join(" → ")}`);
		return;
	}
	state.set(id, "open");
	for (const dep of tasks.get(id)?.depends ?? []) if (tasks.has(dep)) visit(dep, [...path, id]);
	state.set(id, "done");
};
for (const id of tasks.keys()) visit(id, []);

// The phase board lists every scheduled task once, under its own phase.
const board = texts.get(index)?.split("## Phase board")[1]?.split("\n## ")[0] ?? "";
const onBoard = new Map();
let boardPhase = null;
for (const line of board.split("\n")) {
	const header = line.match(/^### Phase (\d)/);
	if (header) boardPhase = Number(header[1]);
	else if (/^### /.test(line)) boardPhase = null;
	if (boardPhase === null || !/^- /.test(line)) continue;
	for (const id of idsIn(line)) onBoard.set(id, [...(onBoard.get(id) ?? []), boardPhase]);
}
for (const [id, task] of tasks) {
	if (task.status === "dropped" || task.phase === POST_PILOT) continue;
	const phases = onBoard.get(id);
	if (!phases) problems.push(`${id}: missing from the README phase board (its phase is ${task.phase})`);
	else if (!phases.includes(task.phase))
		problems.push(`${id}: on the board under phase ${phases.join("/")}, but its Status says phase ${task.phase}`);
}

const counts = Object.fromEntries(statuses.map((s) => [s, 0]));
for (const task of tasks.values()) if (task.status) counts[task.status] += 1;
const summary = statuses.map((s) => `${counts[s]} ${s}`).join(", ");
if (problems.length > 0) {
	console.error(`Plan check failed (${problems.length}):`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}
console.log(`Plan check passed: ${tasks.size} tasks across ${files.length} files (${summary}).`);
