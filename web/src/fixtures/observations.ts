import type { DeviceRecord, HistoryEvent, Observation, ObservationAnswer } from "./types";

/**
 * The 14 observations the server holds for Play Study, exactly as the Data design lists them. Every
 * count a screen shows (play types 5/4/3/2; JL 6 · PS 4 · AK 4; 5 of 9 zone-rounds) is derived from these
 * rows by ./derive.ts, never typed in. `review` is proposal U5.
 */

type Row = [
	id: string,
	zone: string,
	round: number,
	time: string,
	playType: string,
	playTypeLabel: string,
	observer: string,
	review: Observation["review"],
	place: [number, number],
	subtype: string,
	age: string,
	summary: string
];

const ROWS: Row[] = [
	[
		"OBS-0244",
		"woodland-edge",
		3,
		"11:28",
		"physical",
		"Physical",
		"JL",
		"notReviewed",
		[0.62, 0.55],
		"Gross motor",
		"9–12 yrs",
		"Three children race along the log line at the woodland edge, jumping the gaps between the logs."
	],
	[
		"OBS-0243",
		"woodland-edge",
		3,
		"11:21",
		"restorative",
		"Restorative",
		"JL",
		"notReviewed",
		[0.38, 0.72],
		"Resting",
		"6–8 yrs",
		"A child sits on the low log with a jacket over her knees, watching the others."
	],
	[
		"OBS-0242",
		"north-meadow",
		1,
		"10:52",
		"imaginative",
		"Imaginative",
		"PS",
		"approved",
		[0.72, 0.35],
		"Socio-dramatic",
		"6–8 yrs",
		"Two children run a pretend shop from a fallen branch, trading leaves as money."
	],
	[
		"OBS-0241",
		"woodland-edge",
		2,
		"10:47",
		"exploratory",
		"Exploratory",
		"JL",
		"notReviewed",
		[0.22, 0.42],
		"Sensory",
		"3–5 yrs",
		"A child turns over bark pieces one by one and looks at what is underneath."
	],
	[
		"OBS-0240",
		"north-meadow",
		1,
		"10:41",
		"physical",
		"Physical",
		"PS",
		"approved",
		[0.48, 0.62],
		"Gross motor",
		"9–12 yrs",
		"A group plays tag across the open grass, looping around the two trees."
	],
	[
		"OBS-0239",
		"woodland-edge",
		2,
		"10:12",
		"imaginative",
		"Imaginative",
		"JL",
		"approved",
		[0.52, 0.3],
		"Fantasy",
		"6–8 yrs",
		"Two children guard a 'castle' made from the log pile against an imaginary dragon."
	],
	[
		"OBS-0238",
		"north-meadow",
		2,
		"10:05",
		"physical",
		"Physical",
		"AK",
		"approved",
		[0.84, 0.55],
		"Rough & tumble",
		"9–12 yrs",
		"Two friends wrestle and roll down the shallow slope, laughing."
	],
	[
		"OBS-0237",
		"sand-area",
		1,
		"09:40",
		"exploratory",
		"Exploratory",
		"AK",
		"approved",
		[0.7, 0.62],
		"Constructive",
		"3–5 yrs",
		"A child pours wet sand into a bucket and tips it out to make towers."
	],
	[
		"OBS-0236",
		"north-meadow",
		1,
		"09:31",
		"physical",
		"Physical",
		"PS",
		"approved",
		[0.3, 0.48],
		"Gross motor",
		"6–8 yrs",
		"A child practises cartwheels along the edge of the path."
	],
	[
		"OBS-0235",
		"north-meadow",
		2,
		"09:26",
		"exploratory",
		"Exploratory",
		"AK",
		"approved",
		[0.6, 0.22],
		"Active",
		"6–8 yrs",
		"Three children search the long grass for crickets, calling out each find."
	],
	[
		"OBS-0234",
		"north-meadow",
		1,
		"09:12",
		"restorative",
		"Restorative",
		"PS",
		"approved",
		[0.16, 0.3],
		"Onlooking",
		"9–12 yrs",
		"A child leans on the fence and watches the tag game without joining."
	],
	[
		"OBS-0233",
		"woodland-edge",
		1,
		"09:05",
		"imaginative",
		"Imaginative",
		"JL",
		"approved",
		[0.74, 0.78],
		"Symbolic",
		"3–5 yrs",
		"A child lines up pine cones as 'passengers' on a log train."
	],
	[
		"OBS-0232",
		"north-meadow",
		2,
		"08:58",
		"physical",
		"Physical",
		"AK",
		"approved",
		[0.42, 0.8],
		"Gross motor",
		"9–12 yrs",
		"Two children race from the bench to the big tree and back."
	],
	[
		"OBS-0231",
		"woodland-edge",
		1,
		"08:51",
		"exploratory",
		"Exploratory",
		"JL",
		"approved",
		[0.3, 0.62],
		"Active",
		"6–8 yrs",
		"A child balances along the log line with arms out, testing each log."
	]
];

const INTENSITY: Record<string, string> = {
	physical: "4–5 · moderate to vigorous",
	exploratory: "3 · slow",
	imaginative: "3 · slow",
	restorative: "1–2 · stationary"
};

function answersFor(row: Row): ObservationAnswer[] {
	const [, , , , playType, playTypeLabel, observer, , , subtype, age, summary] = row;
	return [
		{ questionId: "age_range", label: "How old is the target child?", value: age, requirement: "Required" },
		{ questionId: "play_type_1", label: "Primary play type", value: playTypeLabel, requirement: "Required" },
		{
			questionId: "play_subtype_1",
			label: "Which kind of play?",
			value: subtype,
			requirement: "Follows the primary play type"
		},
		{
			questionId: "play_type_2",
			label: "A second play type, if there is one",
			value: null,
			requirement: "Optional"
		},
		{
			questionId: "cars_intensity",
			label: "How physically intense is it?",
			value: INTENSITY[playType] ?? null,
			requirement: "Optional"
		},
		{
			questionId: "wildlife_interaction",
			label: "Is the child interacting with wildlife?",
			value: "No",
			requirement: "Optional"
		},
		{ questionId: "observer_initials", label: "Who is observing?", value: observer, requirement: "Required" },
		{ questionId: "play_event_summary", label: "Describe the play event", value: summary, requirement: "Required" }
	];
}

function historyFor(row: Row, captured: string, uploaded: string): HistoryEvent[] {
	const [, , , , , , observer, review] = row;
	const events: HistoryEvent[] = [
		{
			tone: "saved",
			title: "Captured and stored",
			detail: `On ${observer}'s device. Form and map versions were fixed at this moment.`,
			time: captured
		},
		{
			tone: "uploaded",
			title: "Uploaded",
			detail: "The server acknowledged the record. A separate event from saving.",
			time: uploaded
		}
	];
	if (review === "notReviewed")
		events.push({
			tone: "waiting",
			title: "Review: not yet reviewed",
			detail: "Approve or exclude decides analyst visibility under the Approved-only scope.",
			time: "Now"
		});
	else
		events.push({
			tone: review === "approved" ? "saved" : "attention",
			title: review === "approved" ? "Review: approved" : "Review: excluded",
			detail: "Approve or exclude decides analyst visibility under the Approved-only scope.",
			time: "Oct 02"
		});
	return events;
}

function plusMinute(time: string): string {
	const [h = 0, m = 0] = time.split(":").map(Number);
	const total = h * 60 + m + 1;
	return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const OBSERVATIONS: Observation[] = ROWS.map(row => {
	const [id, zone, round, time, playType, playTypeLabel, observer, review, [u, v], , , summary] = row;
	const uploaded = plusMinute(time);
	return {
		id,
		projectSlug: "play-study",
		siteSlug: "riverside",
		zoneSlug: zone,
		round,
		capturedAt: `2026-10-02T${time}:00-04:00`,
		uploadedAt: `2026-10-02T${uploaded}:00-04:00`,
		playType,
		playTypeLabel,
		observerInitials: observer,
		formVersion: "demo-v1",
		mapVersion: "v3",
		review,
		place: { u, v },
		answers: answersFor(row),
		history: historyFor(row, time, uploaded),
		summary
	};
});

/** Records that are still on observers' devices. The server never counts these. */
export const DEVICE_RECORDS: DeviceRecord[] = [
	{
		id: "OBS-0249",
		ownerId: "pratyush",
		zoneSlug: "north-meadow",
		round: 1,
		time: "11:34",
		state: "onDevice",
		summary: "Physical · Gross motor · 6–8 yrs"
	},
	{
		id: "OBS-0248",
		ownerId: "pratyush",
		zoneSlug: "north-meadow",
		round: 1,
		time: "11:32",
		state: "attention",
		summary: "Physical play",
		problem: "The observer code is missing from this record."
	},
	{ id: "OBS-0247", ownerId: "pratyush", zoneSlug: "north-meadow", round: 1, time: "11:31", state: "held" },
	{ id: "OBS-0246", ownerId: "pratyush", zoneSlug: "north-meadow", round: 1, time: "11:30", state: "onDevice" },
	{ id: "OBS-0245", ownerId: "pratyush", zoneSlug: "north-meadow", round: 1, time: "11:29", state: "uploading" }
];

export function observationById(id: string): Observation | undefined {
	const normalised = id.toUpperCase();
	return OBSERVATIONS.find(obs => obs.id === normalised);
}
