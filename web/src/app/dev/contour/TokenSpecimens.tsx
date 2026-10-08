import { FactsList, InnerPanel, Mono } from "@/components/contour";
import { CONTOUR, type ThemeName, THEMES } from "@/lib/contour";

import { Specimen } from "./GalleryParts";

type ColourKey = keyof typeof CONTOUR.themes.day;
type TypeRole = keyof typeof CONTOUR.type.web;
type RadiusKey = keyof typeof CONTOUR.radius.web;

/** camelCase to the custom property name scripts/contour-tokens.mjs writes: ink2 → ink-2, onNavCurrent → on-nav-current. */
function tokenName(key: string): string {
	return key
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([a-zA-Z])(\d)/g, "$1-$2")
		.toLowerCase();
}

function themeLabel(theme: ThemeName): string {
	return theme.charAt(0).toUpperCase() + theme.slice(1);
}

/* The colour roles as DESIGN.md §3 groups them. A key the contract gains later lands in "Other" until it is
   placed here, so the swatches always show every token. */
const COLOUR_GROUPS: { title: string; keys: ColourKey[] }[] = [
	{ title: "Surfaces and lines", keys: ["ground", "island", "well", "ledge", "line", "rule", "edge"] },
	{ title: "Text and accent", keys: ["ink", "ink2", "onInk", "accent", "accentSoft", "onAccent"] },
	{
		title: "Navigation, focus and overlay",
		keys: ["nav", "onNav", "navCurrent", "onNavCurrent", "focus", "focusGap", "scrim"]
	},
	{
		title: "State families",
		keys: [
			"saved",
			"savedSoft",
			"waiting",
			"waitingSoft",
			"uploaded",
			"uploadedSoft",
			"attention",
			"attentionSoft",
			"onAttention",
			"held",
			"heldSoft"
		]
	}
];

function colourGroups() {
	const placed = new Set<string>(COLOUR_GROUPS.flatMap(group => group.keys));
	const other = (Object.keys(CONTOUR.themes.day) as ColourKey[]).filter(key => !placed.has(key));
	return other.length > 0 ? [...COLOUR_GROUPS, { title: "Other", keys: other }] : COLOUR_GROUPS;
}

/** One theme's colour tokens, inside its own data-theme scope so every swatch resolves in that theme. */
function ThemeSwatches({ theme }: { theme: ThemeName }) {
	const values = CONTOUR.themes[theme];
	return (
		<div
			data-theme={theme}
			className="flex min-w-0 flex-col gap-6 rounded-island border border-line bg-ground p-5 text-ink">
			<p className="type-island">{themeLabel(theme)}</p>
			{colourGroups().map(group => (
				<div key={group.title} className="flex flex-col gap-3">
					<h4 className="type-mono-label text-ink-2">{group.title}</h4>
					<ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-3">
						{group.keys.map(key => (
							<li key={key} className="flex min-w-0 items-center gap-3">
								<span
									aria-hidden="true"
									className="size-10 shrink-0 rounded-input border border-line"
									style={{ backgroundColor: `var(--ct-${tokenName(key)})` }}
								/>
								<span className="min-w-0">
									<span className="block type-mono-data text-ink">{tokenName(key)}</span>
									<span className="block type-mono-data text-ink-2">{values[key]}</span>
								</span>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}

/* Utility class per type role. Literal strings, so Tailwind sees every class; the Record type fails the build
   if the contract gains a role this list does not name. */
const TYPE_CLASS: Record<TypeRole, string> = {
	display: "type-display",
	hero: "type-hero",
	auth: "type-auth",
	page: "type-page",
	section: "type-section",
	question: "type-question",
	island: "type-island",
	lead: "type-lead",
	answer: "type-answer",
	body: "type-body",
	small: "type-small",
	monoLabel: "type-mono-label",
	monoData: "type-mono-data",
	monoCode: "type-mono-code",
	monoTitle: "type-mono-title"
};

/** Each role's specimen, in the designs' own words (DESIGN.md §4). */
const TYPE_SAMPLE: Record<TypeRole, string> = {
	display: "The observation. The place. The evidence.",
	hero: "This page is not on the map.",
	auth: "Welcome back",
	page: "What came back from the field",
	section: "14 observations across three zones.",
	question: "Primary play type",
	island: "Zones and coverage",
	lead: "One filter set for the map, table and export.",
	answer: "Physical",
	body: "Coverage is compared with an illustrative target of 3 rounds per zone.",
	small: "Read-only. Stable across wording edits.",
	monoLabel: "Field return",
	monoData: "OBS-0248 · MAP v3 · FORM demo-v1 · 84 MB",
	monoCode: "DECA2026",
	monoTitle: "OBS-0244"
};

function TypeScale() {
	const roles = Object.keys(CONTOUR.type.web) as TypeRole[];
	return (
		<ul className="flex flex-col divide-y divide-rule">
			{roles.map(role => {
				const spec = CONTOUR.type.web[role];
				return (
					<li
						key={role}
						className="grid gap-x-8 gap-y-2 py-4 first:pt-0 last:pb-0 md:grid-cols-[12rem_minmax(0,1fr)]">
						<div className="flex flex-col">
							<span className="type-mono-data text-ink">{TYPE_CLASS[role]}</span>
							<span className="type-mono-data text-ink-2">
								{spec.size} / {spec.lineHeight} · {spec.weight}
							</span>
						</div>
						{/* Display and hero are wider than a phone; they scroll here rather than widen the page. */}
						<div className="min-w-0 overflow-x-auto">
							<p className={`${TYPE_CLASS[role]} text-ink`}>{TYPE_SAMPLE[role]}</p>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

const RADIUS_CLASS: Record<RadiusKey, string> = {
	island: "rounded-island",
	panel: "rounded-panel",
	tile: "rounded-tile",
	note: "rounded-note",
	input: "rounded-input",
	thumb: "rounded-thumb",
	pill: "rounded-pill"
};

function Shapes() {
	const radii = Object.entries(CONTOUR.radius.web) as [RadiusKey, number][];
	return (
		<ul className="flex flex-wrap gap-6">
			{radii.map(([name, value]) => (
				<li key={name} className="flex flex-col items-start gap-2">
					<span
						aria-hidden="true"
						className={`block h-16 w-24 border-2 border-ink bg-island ${RADIUS_CLASS[name]}`}
					/>
					<span className="type-mono-data text-ink">{RADIUS_CLASS[name]}</span>
					<span className="type-mono-data text-ink-2">{value === 999 ? "full" : `${value} px`}</span>
				</li>
			))}
			<li className="flex flex-col items-start gap-2">
				<span
					aria-hidden="true"
					className="block h-16 w-24 rounded-island border border-line bg-island shadow-ledge"
				/>
				<span className="type-mono-data text-ink">shadow-ledge</span>
				<span className="type-mono-data text-ink-2">{CONTOUR.size.web.ledge} px, no blur</span>
			</li>
		</ul>
	);
}

function Motion() {
	const durations = Object.entries(CONTOUR.motion.duration);
	return (
		<FactsList
			labelWidth="10rem"
			items={durations.map(([name, value]) => ({
				label: <Mono>{`--ct-duration-${tokenName(name)}`}</Mono>,
				value: `${value} ms`,
				mono: true
			}))}
		/>
	);
}

/** The Tokens section: both themes' colours side by side, the type scale, shapes and motion timings. */
export function TokenSpecimens() {
	return (
		<>
			<Specimen
				title="Colour · Day and Dusk"
				caption="Each column is its own data-theme scope, so it shows that theme whatever the page theme is. Values come from contracts/contour.json.">
				<div className="grid gap-6 lg:grid-cols-2">
					{THEMES.map(theme => (
						<ThemeSwatches key={theme} theme={theme} />
					))}
				</div>
			</Specimen>
			<Specimen title="Type scale · web">
				<TypeScale />
			</Specimen>
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
				<Specimen title="Shape">
					<Shapes />
				</Specimen>
				<Specimen title="Motion" caption="Reduced motion removes movement and keeps fades at 100 ms or less.">
					<InnerPanel>
						<Motion />
					</InnerPanel>
				</Specimen>
			</div>
		</>
	);
}
