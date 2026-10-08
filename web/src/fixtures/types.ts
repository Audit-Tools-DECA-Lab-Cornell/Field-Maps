/**
 * The preview world's shapes. They follow supabase/migrations where the schema has the concept; fields
 * marked with a proposal code (U2–U7) exist only as design proposals and every screen that shows them
 * carries that proposal's flag (D20, web/AGENTS.md).
 */

export type OrgRole = "owner" | "admin" | "member";
export type ProjectRole = "manager" | "observer" | "viewer";
export type ProjectState = "active" | "preparing" | "practice" | "archived";

export type Person = {
	id: string;
	name: string;
	initials: string;
	email: string;
};

export type Organization = {
	slug: string;
	name: string;
	fullName: string;
	ownerId: string;
	createdLabel: string;
};

export type Project = {
	slug: string;
	orgSlug: string;
	name: string;
	code: string;
	state: ProjectState;
	summary: string;
	timezone: string;
	/** Illustrative coverage target (U6 proposes planning; the target itself is a project setting). */
	target: { roundsPerZone: number; observationsPerRound: number };
	publicationScope: "accepted" | "approved"; // "approved" is proposal U5
	lastSaved: { by: string; label: string };
	/** Training is never counted in research datasets or coverage. */
	counted: boolean;
};

export type OrgMembership = { personId: string; orgSlug: string; role: OrgRole; since?: string };
export type ProjectMembership = { personId: string; projectSlug: string; role: ProjectRole; collectsAs?: string };

export type Invitation = {
	email: string;
	scope: "organization" | "project";
	projectSlug?: string;
	role: ProjectRole | OrgRole;
	state: "waiting" | "accepted" | "revoked";
	sentLabel: string;
};

export type Zone = {
	id: string; // zone-a
	slug: string; // north-meadow
	code: string; // A
	name: string;
	siteSlug: string;
	description: string;
};

export type PackageState = "active" | "inspecting" | "archived" | "bundled";

export type PackageCheck = {
	label: string;
	detail: string;
	state: "passes" | "checking" | "fails";
};

export type MapPackage = {
	siteSlug: string;
	version: string; // v3
	sizeMb: number | null;
	uploadedLabel: string;
	uploadedBy: string | null;
	state: PackageState;
	onDevices: string;
	file?: string;
	coordinateSystem?: string;
	layers?: string;
	extent?: string;
	checks?: PackageCheck[];
	formAssignment?: string;
	importedFrom?: string;
};

export type Site = {
	slug: string;
	projectSlug: string;
	name: string;
	summary: string;
	/** Name of the fixture geometry in contracts/fixtures/sites. */
	geometry: "riverside" | "fall-creek" | "practice-garden";
	zoneSlugs: string[];
	training: boolean;
	coverageNote?: string;
};

export type DeviceReport = {
	personId: string;
	siteSlug: string;
	mapPackage: { state: "downloaded" | "unknown"; label: string };
	form: { state: "formAvailable" | "unknown"; label: string };
	lastChecked: string;
};

export type FormVersionState = "draft" | "published" | "retired";

export type FormChange = {
	questionId: string;
	field: "Guidance" | "Question label";
	was: string;
	now: string;
	detail: string;
};

export type FormVersion = {
	id: string; // demo-v1
	formSlug: string;
	state: FormVersionState;
	inUse: string;
	changes: FormChange[];
	protocolNotesOpen: number;
	/** The canonical definition file the version renders from. */
	source: string;
};

export type ProjectForm = {
	slug: string;
	projectSlug: string;
	title: string;
	summary: string;
	questions: { total: number; conditional: number };
	assignedTo: string;
	inUse: string;
	versionIds: string[];
	note?: string;
};

export type ReviewState = "notReviewed" | "approved" | "excluded"; // proposal U5

export type ObservationAnswer = {
	questionId: string;
	label: string;
	value: string | null;
	requirement: "Required" | "Optional" | "Follows the primary play type";
};

export type HistoryEvent = {
	tone: "saved" | "uploaded" | "waiting" | "attention" | "held" | "ink";
	title: string;
	detail: string;
	time: string;
};

export type Observation = {
	id: string; // OBS-0244
	projectSlug: string;
	siteSlug: string;
	zoneSlug: string;
	round: number;
	capturedAt: string; // ISO with offset
	uploadedAt: string | null;
	playType: string; // option code
	playTypeLabel: string;
	observerInitials: string;
	formVersion: string;
	mapVersion: string;
	review: ReviewState; // U5
	/** Position inside the zone, as a fraction of the zone's bounding box (resolved to a point by the map layer). */
	place: { u: number; v: number };
	answers?: ObservationAnswer[];
	history?: HistoryEvent[];
	summary?: string;
};

export type DeviceRecordState = "onDevice" | "uploading" | "uploaded" | "attention" | "held";

export type DeviceRecord = {
	id: string;
	ownerId: string;
	zoneSlug: string;
	round: number;
	time: string;
	state: DeviceRecordState;
	summary?: string;
	problem?: string;
};

export type ActivityItem = { tone: HistoryEvent["tone"]; title: string; detail: string; time: string };

export type BlockingItem = {
	tone: "attention" | "waiting";
	icon: "triangle-alert" | "pencil" | "clock";
	title: string;
	detail: string;
	meta?: string;
	action?: { label: string; href: string };
};

export type ReaderGrant = { reader: string; scope: string; privilege: string; expiry: string };
export type CodebookField = { column: string; type: string; meaning: string };

export type Template = {
	id: string;
	title: string;
	state: "templateDraft" | "training";
	summary: string;
};

export type LibraryVariable = { question: string; kind: string; code: string; source: string };

export type PrintableReport = {
	id: string; // RIV-01
	slug: string;
	title: string;
	scope: string;
	siteSlug: string;
	zoneSlug?: string;
	rounds: number[];
};

export type SavedView = {
	id: string;
	name: string;
	zone: string | null;
	round: number | null;
	playType: string | null;
	query: string;
	savedBy: string;
	savedLabel: string;
};

export type RoundPlan = { round: number; window: string; zones: string; observers: string };
