import type { DisplayRule, FormVersion, QualityFlag, Variable } from "@/types/domain";

/**
 * The instrument: the variable library, the display logic and the published versions.
 *
 * Every row below is traceable to a cell in Janet's workbooks, by way of the parsed extract the
 * `Riverside Workspace` design canvas was written against. Where the source has not supplied an
 * export column or an option list, the row carries the gap as a flag instead of inventing one —
 * the same rule `mobile/src/forms/fixtures/janet-test-v1.ts` follows.
 */

/** The nine play types the instrument records, in workbook order. */
export const PLAY_TYPES: readonly string[] = [
	"Physical",
	"Exploratory",
	"Imaginative",
	"Play with Rules",
	"Bio",
	"Expressive",
	"Restorative",
	"Digital",
	"Non-Play"
];

/** A marker's shape is its play type, so type survives greyscale and colour blindness. */
export type MarkerShape = "square" | "circle" | "triangle" | "diamond";

export function shapeForPlayType(type: string): MarkerShape {
	if (type === "Physical") return "square";
	if (type === "Exploratory") return "circle";
	if (type === "Imaginative") return "triangle";
	return "diamond";
}

export const VARIABLES: readonly Variable[] = [
	{
		code: "DateTime1",
		exportColumn: "Date_Time",
		label: "Date/Time stamp",
		format: "Full date and full time",
		scope: "event",
		included: true
	},
	{
		code: "DateTime3",
		exportColumn: "Time_Period",
		label: "Time Period",
		format: "Custom set of time blocks · select one",
		scope: "round",
		included: false
	},
	{
		code: "Observer1",
		exportColumn: "Observer_Initials",
		label: "Observer Initials",
		format: "Open field — up to 10 characters, full caps",
		scope: "observer",
		included: true
	},
	{
		code: "Observer3",
		exportColumn: "Observer_ID",
		label: "Observer ID",
		format: "Open field — up to 15 characters",
		scope: "observer",
		included: false
	},
	{
		code: "EnvZone1",
		exportColumn: "Env_Zone_ID",
		label: "Environmental Zone ID",
		format: "Multiple choice of letters · select one",
		scope: "event",
		included: true
	},
	{
		code: "EnvZone3",
		exportColumn: "Env_SubZone_ID",
		label: "Environmental SubZone ID",
		format: "Letters, Roman or custom · select one",
		scope: "event",
		included: true,
		flag: "Library rows B21 and B23 both carry the code EnvZone3 for different definitions. Assign distinct ids before importing."
	},
	{
		code: "RelRound1",
		exportColumn: "Rel_Round",
		label: "Reliability Round",
		format: "Binary · defaults to No",
		scope: "round",
		included: true
	},
	{
		code: "FirstRound1",
		exportColumn: "First_Round",
		label: "First Round of Observation",
		format: "Yes/no · defaults to No",
		scope: "round",
		included: true
	},
	{
		code: "Climate1",
		exportColumn: "Weather",
		label: "Current weather conditions",
		format: "Multiple choice · select all that apply",
		scope: "round",
		included: true
	},
	{
		code: "Climate2",
		exportColumn: "Wind",
		label: "Current wind conditions",
		format: "Multiple choice · select one",
		scope: "round",
		included: true
	},
	{
		code: "Climate3",
		exportColumn: "Shade",
		label: "Shade conditions (round)",
		format: "Multiple choice · select one",
		scope: "round",
		included: true,
		flag: "Collides with Shade1, the event-scope shade question, which also exports as Shade. One of the two needs renaming."
	},
	{
		code: "LP Inventory 1",
		exportColumn: "Inv_Nat_Surfaces",
		label: "Quantity available in zone: natural ground surfaces and loose materials",
		format: "Select one · quantity bands",
		scope: "zone",
		included: false,
		flag: "Its rule reads “if YES, make LP Inventory 2 visible” but the answers are quantity bands, so the rule has no truth value as written."
	},
	{
		code: "Summary1",
		exportColumn: "Play_Event_Summary",
		label: "Play Event Summary",
		format: "Open field — 1000 characters",
		scope: "event",
		included: true
	},
	{
		code: "Clothing1",
		exportColumn: "Child_Clothing",
		label: "Target child clothing colour or description",
		format: "Open — up to 500 characters",
		scope: "event",
		included: false
	},
	{
		code: "Age1",
		exportColumn: "Child_AgeRange",
		label: "Child age range",
		format: "Select one · 6 bands from 0–2 years",
		scope: "event",
		included: true
	},
	{
		code: "Age3",
		exportColumn: "Child_AgeRange_EY",
		label: "Child age range, early years",
		format: "Select one · 0–2, 3–5",
		scope: "event",
		included: false
	},
	{
		code: "Gender1",
		exportColumn: "",
		label: "Child presenting gender",
		format: "Select one · Female, Male, Unknown",
		scope: "event",
		included: true,
		flag: "No export column name in either workbook. Blocks a clean export until the lab approves one."
	},
	{
		code: "PeerIntn1",
		exportColumn: "Grp_Composition",
		label: "Group composition",
		format: "Select one · 5 options",
		scope: "event",
		included: true
	},
	{
		code: "PeerIntn2",
		exportColumn: "No_Other_Children",
		label: "Number of other children involved",
		format: "Select one · None to 7 or more",
		scope: "event",
		included: true
	},
	{
		code: "PeerIntn4",
		exportColumn: "Peer_Intn",
		label: "Peer interaction",
		format: "Select one · 6 options",
		scope: "event",
		included: true
	},
	{
		code: "AdultIntn1",
		exportColumn: "Adults_Engaged",
		label: "Number of adults present or engaged",
		format: "Select one · No adults to 3 or more",
		scope: "event",
		included: true
	},
	{
		code: "AdultIntn3",
		exportColumn: "Adult_Intn",
		label: "Adult interaction, collapsed",
		format: "Select one · 7 options",
		scope: "event",
		included: true
	},
	{
		code: "PlayType1",
		exportColumn: "Play_Type_1",
		label: "Primary play type 1",
		format: "Select one · 9 types",
		scope: "event",
		included: true
	},
	{
		code: "PlayType2",
		exportColumn: "Play_Type_2",
		label: "Primary play type 2",
		format: "Select one · 9 types",
		scope: "event",
		included: true,
		flag: "Needs its own subtype storage; the test sheet provides one subtype set for two play-type slots."
	},
	{
		code: "CARS2",
		exportColumn: "CARS",
		label: "CARS activity intensity, collapsed",
		format: "Select one · 3 bands",
		scope: "event",
		included: true
	},
	{
		code: "Risk1",
		exportColumn: "Risk",
		label: "Risk type, expanded",
		format: "Select one · 10 options",
		scope: "event",
		included: true
	},
	{
		code: "PlayComm1",
		exportColumn: "Play_Communication",
		label: "Play communication",
		format: "Select one · 8 options",
		scope: "event",
		included: true
	},
	{
		code: "FixedNat1",
		exportColumn: "Fixed_Nat_Intn",
		label: "Fixed natural interaction",
		format: "Select one · Yes or No",
		scope: "event",
		included: true
	},
	{
		code: "FixedDes1",
		exportColumn: "Fixed_Designed_Intn",
		label: "Fixed designed interaction",
		format: "Select one · Yes or No",
		scope: "event",
		included: true
	},
	{
		code: "LooseParts1",
		exportColumn: "LP_Intn_Binary",
		label: "Loose parts interaction",
		format: "Select one · No by default",
		scope: "event",
		included: true
	},
	{
		code: "LooseParts3",
		exportColumn: "Nat_LP_Intn_Binary",
		label: "Manufactured loose parts interaction",
		format: "Select one · No by default",
		scope: "event",
		included: true,
		flag: "Shares its export column with LooseParts2, the natural equivalent. Needs a distinct name."
	},
	{
		code: "LooseParts11",
		exportColumn: "Nat_LPs_Lrg",
		label: "Large natural loose parts checklist",
		format: "Check all that apply · list pending",
		scope: "event",
		included: true,
		flag: "Shares its export column with the LooseParts10 yes/no answer."
	},
	{
		code: "Wildlife1",
		exportColumn: "Wildlife_Intn",
		label: "Wildlife interaction",
		format: "Select one · Yes or No",
		scope: "event",
		included: true
	},
	{
		code: "Shade1",
		exportColumn: "Shade",
		label: "Shade conditions (event)",
		format: "Select one · n/a, yes, no, partial",
		scope: "event",
		included: true,
		flag: "Collides with Climate3, the round-scope shade question, which also exports as Shade."
	},
	{
		code: "Topography1",
		exportColumn: "Topography",
		label: "Topography",
		format: "Select one · 7 options",
		scope: "event",
		included: true
	}
];

export const DISPLAY_RULES: readonly DisplayRule[] = [
	{
		parent: "LP_Intn_Binary",
		value: "Yes",
		children: "LooseParts2 (natural interaction) and LooseParts3 (manufactured interaction)"
	},
	{ parent: "Nat_LP_Intn_Binary", value: "Yes", children: "LooseParts4, 6, 8 and 10 — the natural size bands" },
	{ parent: "Nat_LPs_Sm", value: "Yes", children: "LooseParts7 — the small natural checklist" },
	{
		parent: "Grp_Composition",
		value: "anything but Solitary",
		children: "PeerIntn2 (number of other children) and PeerIntn4 (peer interaction)"
	},
	{ parent: "Play_Type_1", value: "any type", children: "that type’s subtype question, in slot 1" },
	{ parent: "Wildlife_Intn", value: "Yes", children: "Wildlife2, Wildlife3 and Wildlife5" },
	{
		parent: "Inv_Nat_Surfaces",
		value: "YES",
		children: "LP Inventory 2 — the natural surfaces checklist",
		problem:
			"Inv_Nat_Surfaces answers with quantity bands, so “is YES” has no truth value. It needs a presence question, or a predicate such as “is any band above none”."
	},
	{
		parent: "Adult_Intn",
		value: "Other (open)",
		children: "AdultIntn4 — the description field",
		problem:
			"Test row H70 pairs the Other description with the whole parent group rather than with the Other option. The two-stage rule needs confirming separately."
	}
];

export const QUALITY_FLAGS: readonly QualityFlag[] = [
	{
		id: "thin-summary",
		label: "Summary under 20 characters",
		body: "Play_Event_Summary is shorter than the protocol asks for. Short text limits later coding; the record is kept and exported either way."
	},
	{
		id: "loose-parts-empty",
		label: "Loose parts Yes, list empty",
		body: "LP_Intn_Binary is Yes and Nat_LPs_Sm is Yes, but Nat_LPs_Sm_List has no items. Either the checklist was skipped or the parent answer is wrong."
	},
	{
		id: "near-duplicate",
		label: "Coordinates within 2 m",
		body: "Another observation in the same round sits under 2 m away with the same play type. Possibly a double tap, possibly two genuine concurrent events."
	},
	{
		id: "round-incomplete",
		label: "Round context incomplete",
		body: "The round snapshot has no Wind value. The round was started before the climate step was finished."
	}
];

export function flagById(id: string | null): QualityFlag | undefined {
	return id === null ? undefined : QUALITY_FLAGS.find(flag => flag.id === id);
}

const includedCount = VARIABLES.filter(variable => variable.included).length;

export const FORM_VERSIONS: readonly FormVersion[] = [
	{
		id: "fv-shell-v1",
		code: "shell-v1",
		label: "Practice shell",
		state: "published",
		publishedAt: "2026-09-12T14:05:00Z",
		recordCount: 2,
		variableCount: 3,
		note: "The three-field practice form. It is the only version the API accepts today, and the only one with records in the database."
	},
	{
		id: "fv-janet-test-v1",
		code: "janet-test-v1",
		label: "Janet test subset",
		state: "draft",
		publishedAt: null,
		recordCount: 0,
		variableCount: includedCount,
		note: "The first versioned instrument slice. It renders and saves on the device, but records are held there: the API accepts only shell-v1, and the flagged rows below are unresolved."
	}
];

export const DRAFT_VERSION = FORM_VERSIONS[1]!;
export const PUBLISHED_VERSION = FORM_VERSIONS[0]!;

export const BLOCKING_FLAGS = VARIABLES.filter(variable => variable.included && variable.flag !== undefined);
