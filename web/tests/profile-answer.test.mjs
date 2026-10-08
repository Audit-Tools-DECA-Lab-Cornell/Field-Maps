import assert from "node:assert/strict";
import test from "node:test";

import { IDLE, sameProfile, settleSave, shownAnswer } from "../src/features/account/answer.ts";

const typed = { displayName: "  Pratyush Sudhakar ", initials: "PS", locale: " en-US" };
const kept = { displayName: "Pratyush Sudhakar", initials: "PS", locale: "en-US" };
const saved = { status: "saved", saved: kept };
const refused = { status: "failed", message: "Nothing was saved. The server could not be reached. Try again." };

/**
 * The form's own steps: an edit marks the answer showing at the time (`editedAfter`), and the save's answer
 * is settled against what the fields hold when it arrives. Returns what the person sees afterwards.
 */
function run({ previous = IDLE, submitted, result, typedDuringSave }) {
	let current = submitted;
	let editedAfter = null;
	if (typedDuringSave) {
		current = { ...current, ...typedDuringSave };
		editedAfter = previous; // the state at the time of the edit: the save has not answered yet
	}
	const settled = settleSave(result, submitted, current);
	return { values: settled.values, answer: shownAnswer(settled.answer, editedAfter) };
}

test("an untouched form takes what the server kept and shows the saved note", () => {
	const seen = run({ submitted: typed, result: saved });
	assert.deepEqual(seen.values, kept);
	assert.equal(seen.answer, saved);
});

test("typing during the save keeps the newer edits and retires the saved note", () => {
	const seen = run({ submitted: typed, result: saved, typedDuringSave: { displayName: "Pratyush S" } });
	assert.deepEqual(seen.values, { ...typed, displayName: "Pratyush S" });
	assert.equal(seen.answer, IDLE);
});

test("typing during a save that follows an earlier saved answer still retires the new note", () => {
	const earlier = { status: "saved", saved: typed };
	const seen = run({ previous: earlier, submitted: kept, result: saved, typedDuringSave: { initials: "PSX" } });
	assert.equal(seen.values.initials, "PSX");
	assert.equal(seen.answer, IDLE);
});

test("edits undone before the answer count as untouched", () => {
	const settled = settleSave(saved, typed, { ...typed });
	assert.deepEqual(settled.values, kept);
	assert.equal(shownAnswer(settled.answer, null), saved);
});

test("fields already holding what the server kept show the saved note", () => {
	const settled = settleSave(saved, typed, { ...kept });
	assert.deepEqual(settled.values, kept);
	assert.equal(shownAnswer(settled.answer, IDLE), saved);
});

test("a failure leaves the fields alone and stays shown after typing during the save", () => {
	const seen = run({ submitted: typed, result: refused, typedDuringSave: { locale: "en-GB" } });
	assert.deepEqual(seen.values, { ...typed, locale: "en-GB" });
	assert.equal(seen.answer, refused);
});

test("a failure on an untouched form leaves the fields as typed", () => {
	const current = { ...typed };
	const settled = settleSave(refused, typed, current);
	assert.equal(settled.values, current);
	assert.equal(settled.answer, refused);
});

test("edits after an answer retire it", () => {
	const settled = settleSave(saved, typed, typed);
	assert.equal(shownAnswer(settled.answer, settled.answer), IDLE);
	assert.equal(shownAnswer(refused, refused), IDLE);
});

test("compares every field", () => {
	assert.ok(sameProfile(kept, { ...kept }));
	for (const field of Object.keys(kept)) assert.ok(!sameProfile(kept, { ...kept, [field]: "x" }));
});
