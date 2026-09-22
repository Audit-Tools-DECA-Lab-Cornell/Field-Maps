import { QUALITY_FLAGS } from "@/data/instrument";
import { ACTIVE_SITE } from "@/data/project";
import type { Observation, ObservationAnswer, RecordState } from "@/types/domain";

/**
 * A local fixture set, not the database.
 *
 * The API has three routes and this application calls none of them, so these records are
 * generated here — deterministically, from a fixed seed, so the server and the browser render the
 * same rows and the same points. Their shape is the real one: a site, a zone, a round, an
 * observer, a form version, a revision, a point in EPSG:4326 and one answer per variable, with
 * `null` reserved for a question the display logic hid at collection time.
 *
 * Every screen that shows them says where they come from. When the console is wired to
 * `/v1/projects/{id}/observations`, this file goes away; nothing above it needs to change shape.
 */

const SEED = 20260922;
const OBSERVERS = ACTIVE_SITE.observers;
const ROUNDS = ACTIVE_SITE.rounds;

/** Physical play is the commonest event, so the draw is weighted rather than uniform. */
const TYPE_DRAW = [
	"Physical",
	"Physical",
	"Physical",
	"Physical",
	"Exploratory",
	"Exploratory",
	"Exploratory",
	"Imaginative",
	"Imaginative",
	"Imaginative",
	"Play with Rules",
	"Play with Rules",
	"Bio",
	"Expressive",
	"Restorative",
	"Non-Play"
];

/** mulberry32: small, deterministic, and enough for placing fixture points inside a rectangle. */
function mulberry(seed: number): () => number {
	let a = seed | 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const AGE_BANDS = ["0–2 yrs", "3–5 yrs", "6–8 yrs", "9–11 yrs", "12–14 yrs", "15+ yrs"];
const GROUPS = ["Solitary", "Dyad", "Small group (3–5)", "Large group (6+)", "Mixed age group"];
const PEER = ["Parallel", "Associative", "Cooperative", "Onlooking", "Conflict", "None"];
const CARS = ["Sedentary", "Light", "Moderate to vigorous"];
const RISK = ["None observed", "Height", "Speed", "Tools", "Rough and tumble", "Getting lost", "Elements"];
const COMMS = ["None", "Verbal", "Gesture", "Vocal", "Shared attention", "Negotiation", "Instruction", "Conflict talk"];
const TOPOGRAPHY = ["Flat", "Gentle slope", "Steep slope", "Mound", "Hollow", "Step or edge", "Mixed"];
const SUMMARIES = [
	"Two children dragging a long branch from the tree line towards the path, stopping twice to rebalance it.",
	"Child climbing the low wall, jumping down, and repeating the circuit six times without pausing.",
	"Small group building a den against the fence using pallet offcuts and a tarpaulin.",
	"Child crouched at the edge of the puddle, moving water with a stick and watching it drain.",
	"Running game with rules agreed aloud: the path is safe, the grass is not.",
	"Child sitting alone under the tree with a book, occasionally watching the game nearby.",
	"Chasing game across the lawn, four children, ending when one falls and the group stops.",
	"Two children carrying water in a bucket to the sand, arguing over who pours.",
	"Short climb.",
	"Child pushing the swing empty and watching it, not riding it."
];

function pick<T>(random: () => number, values: readonly T[]): T {
	return values[Math.floor(random() * values.length)]!;
}

/** Ithaca in September: the fixture records sit across three consecutive collection days. */
const DAYS = ["2026-09-15", "2026-09-16", "2026-09-17"];
const ROUND_HOURS: Record<number, number> = { 1: 9, 2: 12, 3: 15 };

function iso(day: string, hour: number, minute: number): string {
	// The site keeps America/New_York, which is UTC−4 in September.
	return `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-04:00`;
}

function answersFor(random: () => number, zoneId: string, playType: string, summary: string): ObservationAnswer[] {
	const group = pick(random, GROUPS);
	const solitary = group === "Solitary";
	const looseParts = random() < 0.38;
	const wildlife = random() < 0.16;
	return [
		{ code: "EnvZone1", exportColumn: "Env_Zone_ID", label: "Environmental Zone ID", value: zoneId },
		{ code: "Summary1", exportColumn: "Play_Event_Summary", label: "Play Event Summary", value: summary },
		{ code: "Age1", exportColumn: "Child_AgeRange", label: "Child age range", value: pick(random, AGE_BANDS) },
		{
			code: "Gender1",
			exportColumn: "",
			label: "Child presenting gender",
			value: pick(random, ["Female", "Male", "Unknown"])
		},
		{ code: "PeerIntn1", exportColumn: "Grp_Composition", label: "Group composition", value: group },
		{
			code: "PeerIntn2",
			exportColumn: "No_Other_Children",
			label: "Number of other children involved",
			value: solitary ? null : pick(random, ["1", "2", "3", "4", "5", "6", "7 or more"])
		},
		{
			code: "PeerIntn4",
			exportColumn: "Peer_Intn",
			label: "Peer interaction",
			value: solitary ? null : pick(random, PEER)
		},
		{
			code: "AdultIntn1",
			exportColumn: "Adults_Engaged",
			label: "Adults present or engaged",
			value: pick(random, ["No adults", "1", "2", "3 or more"])
		},
		{ code: "PlayType1", exportColumn: "Play_Type_1", label: "Primary play type 1", value: playType },
		{ code: "CARS2", exportColumn: "CARS", label: "CARS activity intensity", value: pick(random, CARS) },
		{ code: "Risk1", exportColumn: "Risk", label: "Risk type", value: pick(random, RISK) },
		{
			code: "PlayComm1",
			exportColumn: "Play_Communication",
			label: "Play communication",
			value: pick(random, COMMS)
		},
		{
			code: "LooseParts1",
			exportColumn: "LP_Intn_Binary",
			label: "Loose parts interaction",
			value: looseParts ? "Yes" : "No"
		},
		{
			code: "LooseParts3",
			exportColumn: "Nat_LP_Intn_Binary",
			label: "Manufactured loose parts interaction",
			value: looseParts ? pick(random, ["Yes", "No"]) : null
		},
		{
			code: "Wildlife1",
			exportColumn: "Wildlife_Intn",
			label: "Wildlife interaction",
			value: wildlife ? "Yes" : "No"
		},
		{
			code: "Shade1",
			exportColumn: "Shade",
			label: "Shade conditions (event)",
			value: pick(random, ["Yes", "No", "Partial", "n/a"])
		},
		{ code: "Topography1", exportColumn: "Topography", label: "Topography", value: pick(random, TOPOGRAPHY) }
	];
}

function build(): readonly Observation[] {
	const random = mulberry(SEED);
	const out: Observation[] = [];
	for (let index = 0; index < 132; index += 1) {
		const zone = pick(random, ACTIVE_SITE.zones);
		const round = pick(random, ROUNDS);
		const day = DAYS[Math.floor(random() * DAYS.length)]!;
		const observer = pick(random, OBSERVERS);
		const playType = pick(random, TYPE_DRAW);
		const summary = pick(random, SUMMARIES);

		// Inset from the zone edge so a point never renders on its own boundary line.
		const longitude = zone.west + 0.00015 + random() * (zone.east - zone.west - 0.0003);
		const latitude = zone.south + 0.0001 + random() * (zone.north - zone.south - 0.0002);

		const minute = Math.floor(random() * 56);
		const observedAt = iso(day, ROUND_HOURS[round] ?? 9, minute);
		// Uploads land while the app is open; the gap is however long the device stayed offline.
		const receivedAt = iso(day, (ROUND_HOURS[round] ?? 9) + 1, Math.min(59, minute + 7));

		const flagged = random() < 0.15;
		const flagId = flagged ? QUALITY_FLAGS[Math.floor(random() * QUALITY_FLAGS.length)]!.id : null;
		const revision = random() < 0.08 ? 2 : 1;
		const withdrawn = random() < 0.03;

		const state: RecordState = withdrawn
			? "withdrawn"
			: flagId !== null
				? "flagged"
				: revision > 1
					? "revised"
					: "in-database";

		const history = [
			{ at: observedAt, message: `Recorded on ${observer}’s device in ${zone.label}.` },
			{ at: receivedAt, message: "Committed by the API into the shared spatial database." },
			...(revision > 1
				? [
						{
							at: receivedAt,
							message: "Revision 2 accepted; revision 1 is kept and is what QGIS read before today."
						}
					]
				: []),
			...(withdrawn
				? [
						{
							at: receivedAt,
							message: "Withdrawn by the observer. The row is kept and excluded from analysis."
						}
					]
				: [])
		];

		out.push({
			id: `OBS-${String(1001 + index)}`,
			siteId: ACTIVE_SITE.id,
			zoneId: zone.id,
			round,
			observerCode: observer ?? "AK",
			observedAt,
			receivedAt,
			formVersionCode: round === 1 ? "janet-test-v1" : "janet-test-v1",
			revision,
			longitude,
			latitude,
			playType,
			answers: answersFor(random, zone.id, playType, summary),
			flagId,
			state,
			history
		});
	}
	return out.sort((left, right) => (left.observedAt < right.observedAt ? 1 : -1));
}

export const OBSERVATIONS: readonly Observation[] = build();

/** The protocol target the coverage matrix is read against: 12 events per zone per round. */
export const ROUND_TARGET = 12;
