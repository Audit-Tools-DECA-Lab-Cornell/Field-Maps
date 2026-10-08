"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	type FocusEvent,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState
} from "react";

import type { Crumb } from "@/components/contour/Breadcrumbs";
import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { IconButton } from "@/components/contour/IconButton";
import { Island, IslandSection } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ProposalNote } from "@/components/contour/ProposalNote";
import { ScreenState } from "@/components/contour/ScreenState";
import { Segmented } from "@/components/contour/Segmented";
import { Select } from "@/components/contour/Select";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { TextInput } from "@/components/contour/TextInput";
import { useToast } from "@/components/contour/Toast";
import { roundRing, sameRing, withRings } from "@/features/packages/geometry";
import { activeRow, inspectingRow, nextDraftVersion, packageRows } from "@/features/packages/model";
import { updateSitePackages, useSitePackagePreview, type ZoneRing } from "@/features/packages/store";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { type Site, zonesFor } from "@/fixtures";
import { cx } from "@/lib/cx";
import type { ProjectedSite } from "@/lib/plan";

import { MapArea } from "./parts";
import { useHydrated } from "./SessionSite";
import { VertexHandles } from "./VertexHandles";

/**
 * Edit zone boundaries (project-09, PROPOSAL U2). A manager drags vertex handles on the plan or types their
 * coordinates; saving creates a package draft in this preview and the active map stays as it is. QGIS stays
 * the pilot's geometry authority, so every change here is session-only and illustrative.
 */

type Rings = Record<string, ZoneRing>;

type EditorState = { rings: Rings; history: Rings[] };

type EditorAction =
	| { type: "begin" }
	| { type: "move"; zone: string; index: number; point: [number, number] }
	| { type: "remove"; zone: string; index: number }
	| { type: "insert"; zone: string; index: number; point: [number, number] }
	| { type: "set"; zone: string; points: Record<number, [number, number]> }
	| { type: "undo" };

const HISTORY_LIMIT = 100;
/** A zone keeps at least this many vertices. */
const MIN_VERTICES = 3;

function snapshot(state: EditorState): EditorState {
	return { ...state, history: [...state.history, state.rings].slice(-HISTORY_LIMIT) };
}

function withRing(rings: Rings, zone: string, ring: ZoneRing): Rings {
	return { ...rings, [zone]: ring };
}

function reducer(state: EditorState, action: EditorAction): EditorState {
	switch (action.type) {
		case "begin":
			return snapshot(state);
		case "move": {
			const ring = state.rings[action.zone];
			if (!ring) return state;
			const current = ring[action.index];
			if (current && current[0] === action.point[0] && current[1] === action.point[1]) return state;
			const next = ring.map((point, index) => (index === action.index ? action.point : point));
			return { ...state, rings: withRing(state.rings, action.zone, next) };
		}
		case "remove": {
			const ring = state.rings[action.zone];
			if (!ring || ring.length <= MIN_VERTICES) return state;
			const saved = snapshot(state);
			return {
				...saved,
				rings: withRing(
					state.rings,
					action.zone,
					ring.filter((_, index) => index !== action.index)
				)
			};
		}
		case "insert": {
			const ring = state.rings[action.zone];
			if (!ring) return state;
			const saved = snapshot(state);
			const next = [...ring.slice(0, action.index), action.point, ...ring.slice(action.index)];
			return { ...saved, rings: withRing(state.rings, action.zone, next) };
		}
		case "set": {
			const ring = state.rings[action.zone];
			if (!ring) return state;
			const next = ring.map((point, index) => action.points[index] ?? point);
			if (sameRing(next, ring)) return state;
			const saved = snapshot(state);
			return { ...saved, rings: withRing(state.rings, action.zone, next) };
		}
		case "undo": {
			const previous = state.history[state.history.length - 1];
			if (!previous) return state;
			return { rings: previous, history: state.history.slice(0, -1) };
		}
	}
}

function ringsEqual(a: Rings, b: Rings): boolean {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
	for (const key of keys) {
		const left = a[key];
		const right = b[key];
		if (!left || !right || !sameRing(left, right)) return false;
	}
	return true;
}

export function ZoneEditorScreen({
	org,
	site,
	plan,
	initialZone
}: {
	org: string;
	site: Site;
	plan: ProjectedSite;
	/** The zone slug from `?zone=`; the first zone when it is missing or unknown. */
	initialZone: string | undefined;
}) {
	const { can } = usePreview();
	const hydrated = useHydrated();
	const preview = useSitePackagePreview(site.slug);
	const rows = packageRows(site.slug, preview);
	const active = activeRow(rows);
	const inspecting = inspectingRow(rows);
	const siteHref = projectHref(org, site.projectSlug, `sites/${site.slug}`);

	/** The package's own boundaries, rounded to whole map units. */
	const packageRings = useMemo(() => {
		const rings: Rings = {};
		for (const zone of plan.zones) rings[zone.id] = roundRing(zone.points);
		return rings;
	}, [plan]);

	/** Where editing starts: the active version's boundaries, then a draft already saved in this preview. */
	const activeDraft = active?.draftZones;
	const inspectingDraft = inspecting?.draftZones;
	const start: Rings = { ...packageRings, ...activeDraft, ...inspectingDraft };

	const zones = zonesFor(site.slug).filter(zone => plan.zones.some(planZone => planZone.id === zone.id));
	const firstZone = zones.find(zone => zone.slug === initialZone) ?? zones[0];

	const crumbs = [
		{ label: "Sites", href: projectHref(org, site.projectSlug, "sites") },
		{ label: site.name, href: siteHref },
		{ label: "Edit zone boundaries" }
	];

	if (!can("uploadPackage") || !firstZone)
		return (
			<EditorFrame crumbs={crumbs}>
				<Island flush>
					{!firstZone ? (
						<ScreenState
							kind="empty"
							headingLevel={2}
							title="No zones to edit"
							body="This site has no zones in its active map package. Zones arrive with a QGIS package."
						/>
					) : (
						<ScreenState
							kind="no-access"
							headingLevel={2}
							body="Your current role can view sites and zones, but cannot edit boundaries. Ask a project manager to review your access."
						/>
					)}
				</Island>
			</EditorFrame>
		);

	// Remounts once after hydration, so a draft kept in this tab's preview is where editing starts.
	return (
		<Editor
			key={hydrated ? "client" : "server"}
			crumbs={crumbs}
			org={org}
			site={site}
			plan={plan}
			zones={zones}
			initialZoneId={firstZone.id}
			start={start}
			packageRings={packageRings}
			draftVersion={nextDraftVersion(rows)}
			baseVersion={active?.version ?? "v1"}
			siteHref={siteHref}
		/>
	);
}

/** The page header and the proposal flag, which stay whatever the editor shows. */
function EditorFrame({ crumbs, actions, children }: { crumbs: Crumb[]; actions?: ReactNode; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={crumbs}
				title="Edit zone boundaries"
				lead="Saving creates a new package draft. The active map stays as it is."
				actions={actions}
			/>
			<ProposalNote code="U2" inline>
				QGIS remains the pilot’s geometry authority. This editor previews a later, versioned web workflow; the
				coordinates are illustrative.
			</ProposalNote>
			{children}
		</div>
	);
}

type EditorProps = {
	crumbs: Crumb[];
	org: string;
	site: Site;
	plan: ProjectedSite;
	zones: ReturnType<typeof zonesFor>;
	initialZoneId: string;
	start: Rings;
	packageRings: Rings;
	draftVersion: string;
	baseVersion: string;
	siteHref: string;
};

function Editor({
	crumbs,
	org,
	site,
	plan,
	zones,
	initialZoneId,
	start,
	packageRings,
	draftVersion,
	baseVersion,
	siteHref
}: EditorProps) {
	const router = useRouter();
	const toast = useToast();
	const { offline } = usePreview();
	const [state, dispatch] = useReducer(reducer, { rings: start, history: [] });
	const [zoneId, setZoneId] = useState(initialZoneId);
	const [selected, setSelected] = useState<number | null>(null);
	const [status, setStatus] = useState("");
	const [confirmDiscard, setConfirmDiscard] = useState(false);
	const leaving = useRef(false);

	const zone = zones.find(entry => entry.id === zoneId) ?? zones[0]!;
	const ring = state.rings[zone.id] ?? [];
	const dirty = !ringsEqual(state.rings, start);
	const packagesHref = projectHref(org, site.projectSlug, `sites/${site.slug}/packages`);
	const shown = useMemo(() => withRings(plan, state.rings), [plan, state.rings]);

	// Leaving the page with unsaved changes asks first.
	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => {
			if (leaving.current) return;
			event.preventDefault();
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	// ⌘Z or Ctrl Z undoes the last change, except while typing, where the field keeps its own undo.
	useEffect(() => {
		const onKey = (event: globalThis.KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
			const target = event.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
			event.preventDefault();
			undo();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	function undo() {
		if (state.history.length === 0) {
			setStatus("Nothing to undo.");
			return;
		}
		dispatch({ type: "undo" });
		setStatus("Last change undone.");
	}

	function chooseZone(id: string) {
		setZoneId(id);
		setSelected(null);
		const slug = zones.find(entry => entry.id === id)?.slug;
		if (slug) window.history.replaceState(null, "", `?zone=${slug}`);
	}

	function removeVertex(index: number) {
		if (ring.length <= MIN_VERTICES) {
			setStatus(`A zone keeps at least ${MIN_VERTICES} vertices.`);
			return;
		}
		dispatch({ type: "remove", zone: zone.id, index });
		setSelected(Math.max(0, index - 1));
		setStatus(`Vertex ${index + 1} removed. ${ring.length - 1} points remain.`);
	}

	function addVertex() {
		const after = selected ?? ring.length - 1;
		const a = ring[after];
		const b = ring[(after + 1) % ring.length];
		if (!a || !b) return;
		const point: [number, number] = [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
		dispatch({ type: "insert", zone: zone.id, index: after + 1, point });
		setSelected(after + 1);
		setStatus(`Vertex ${after + 2} added between vertices ${after + 1} and ${((after + 1) % ring.length) + 1}.`);
	}

	function save() {
		const changed: Rings = {};
		for (const [id, points] of Object.entries(state.rings)) {
			const original = packageRings[id];
			if (!original || !sameRing(points, original)) changed[id] = points;
		}
		updateSitePackages(site.slug, current => ({
			...current,
			draft: { version: draftVersion, base: baseVersion, zones: changed }
		}));
		leaving.current = true;
		toast({
			title: `Package draft ${draftVersion} saved for this preview`,
			description: `${baseVersion} stays active. Inspect the draft under Map packages.`
		});
		router.push(`${packagesHref}?step=inspect`);
	}

	function discard() {
		leaving.current = true;
		setConfirmDiscard(false);
		router.push(siteHref);
	}

	const saveReason = offline
		? "You are offline. The draft can be saved once the connection returns."
		: "The button turns on once a vertex has moved.";

	const actions = (
		<>
			<Dialog
				open={confirmDiscard}
				onOpenChange={setConfirmDiscard}
				title="Discard boundary changes?"
				description={`Your changes to ${changedNames(zones, state.rings, start)} are not saved anywhere. ${baseVersion} stays as it is.`}
				footer={
					<>
						<DialogClose asChild>
							<Button variant="outline">Keep editing</Button>
						</DialogClose>
						<Button variant="ink" icon="x" onClick={discard}>
							Discard changes
						</Button>
					</>
				}
			/>
			<Button variant="outline" icon="x" onClick={() => (dirty ? setConfirmDiscard(true) : discard())}>
				Discard changes
			</Button>
			<Button icon="check" disabled={!dirty || offline} disabledReason={saveReason} onClick={save}>
				Save package draft
			</Button>
		</>
	);

	return (
		<EditorFrame crumbs={crumbs} actions={actions}>
			<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.36fr)_minmax(0,1fr)]">
				<div className="flex min-w-0 flex-col gap-4">
					<MapArea
						site={shown}
						mapVersion={baseVersion}
						title={`Editing ${zone.name}`}
						subtitle="Drag a handle, or type its coordinates"
						zones={{ [zone.id]: { hatched: true, emphasis: "focus" } }}>
						<VertexHandles
							ring={ring}
							selected={selected}
							width={plan.width}
							height={plan.height}
							onSelect={setSelected}
							onBegin={() => dispatch({ type: "begin" })}
							onMove={(index, point) => dispatch({ type: "move", zone: zone.id, index, point })}
							onRemove={removeVertex}
						/>
					</MapArea>
					<div className="flex flex-wrap items-center justify-between gap-3">
						{/* The segments do not fit a phone; there the same choice is a select. */}
						<div className="hidden sm:block">
							<Segmented
								label="Zone to edit"
								value={zone.id}
								onValueChange={chooseZone}
								options={zones.map(entry => ({ value: entry.id, label: entry.name }))}
							/>
						</div>
						<div className="w-full sm:hidden">
							<label htmlFor="zone-to-edit" className="mb-2 block type-small font-semibold text-ink">
								Zone to edit
							</label>
							<Select
								id="zone-to-edit"
								value={zone.id}
								onChange={event => chooseZone(event.target.value)}>
								{zones.map(entry => (
									<option key={entry.id} value={entry.id}>
										{entry.name}
									</option>
								))}
							</Select>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button variant="outline" icon="plus" onClick={addVertex}>
								Add vertex
							</Button>
							<Button variant="outline" icon="undo-2" onClick={undo} aria-keyshortcuts="Meta+Z Control+Z">
								Undo
							</Button>
						</div>
					</div>
					<p role="status" aria-live="polite" className="sr-only">
						{status}
					</p>
				</div>

				<div className="flex min-w-0 flex-col gap-6">
					<VertexIsland
						key={zone.id}
						zoneName={zone.name}
						ring={ring}
						selected={selected}
						width={plan.width}
						height={plan.height}
						onSelect={setSelected}
						onSet={points => dispatch({ type: "set", zone: zone.id, points })}
						onRemove={removeVertex}
						onStatus={setStatus}
					/>
					<Island title="What saving does">
						<ol className="flex flex-col divide-y divide-rule">
							{[
								`Creates package draft ${draftVersion} from ${baseVersion} with this boundary.`,
								`${baseVersion} stays active. Sessions in progress are not touched.`
							].map((line, index) => (
								<li key={line} className="flex gap-4 py-3 first:pt-0">
									<span className="font-semibold tnum">{index + 1}</span>
									<span>{line}</span>
								</li>
							))}
							<li className="flex gap-4 pt-3">
								<span className="font-semibold tnum">3</span>
								<span>
									You inspect and activate the draft under{" "}
									<Link
										href={packagesHref}
										className="text-ink underline decoration-1 underline-offset-4 hover:decoration-2">
										Map packages
									</Link>
									.
								</span>
							</li>
						</ol>
					</Island>
				</div>
			</div>
		</EditorFrame>
	);
}

/** "North meadow and Sand area": the zones whose boundary differs from where editing started. */
function changedNames(zones: EditorProps["zones"], rings: Rings, start: Rings): string {
	const names = zones
		.filter(zone => {
			const now = rings[zone.id];
			const before = start[zone.id];
			return now && before && !sameRing(now, before);
		})
		.map(zone => zone.name);
	if (names.length === 0) return "the boundaries";
	if (names.length === 1) return names[0]!;
	return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

type Axis = "x" | "y";

function VertexIsland({
	zoneName,
	ring,
	selected,
	width,
	height,
	onSelect,
	onSet,
	onRemove,
	onStatus
}: {
	zoneName: string;
	ring: ZoneRing;
	selected: number | null;
	width: number;
	height: number;
	onSelect: (index: number) => void;
	onSet: (points: Record<number, [number, number]>) => void;
	onRemove: (index: number) => void;
	onStatus: (message: string) => void;
}) {
	/** Typed values not yet applied, by "index:axis". */
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const limit = { x: width, y: height };

	function errorOf(axis: Axis, text: string): string | null {
		if (!/^\s*\d+(\.\d+)?\s*$/.test(text)) return "Type a number of map units.";
		const value = Number(text);
		return value < 0 || value > limit[axis] ? "Keep the point inside the site." : null;
	}

	function draftKey(index: number, axis: Axis) {
		return `${index}:${axis}`;
	}

	/** Applies the typed values that are valid, keeps the rest for correction, and says what happened. */
	function commit(keys: string[]): number {
		const points: Record<number, [number, number]> = {};
		const remaining = { ...drafts };
		let invalid = 0;
		for (const key of keys) {
			const text = drafts[key];
			if (text === undefined) continue;
			const [indexText, axis] = key.split(":") as [string, Axis];
			const index = Number(indexText);
			if (errorOf(axis, text)) {
				invalid += 1;
				continue;
			}
			const base = points[index] ?? ring[index];
			if (!base) continue;
			const value = Math.round(Number(text));
			points[index] = axis === "x" ? [value, base[1]] : [base[0], value];
			delete remaining[key];
		}
		if (Object.keys(points).length > 0) onSet(points);
		setDrafts(remaining);
		return invalid;
	}

	function onFieldKey(event: KeyboardEvent<HTMLInputElement>, key: string) {
		if (event.key === "Enter") {
			event.preventDefault();
			commit([key]);
		} else if (event.key === "Escape") {
			setDrafts(current => {
				const next = { ...current };
				delete next[key];
				return next;
			});
		}
	}

	function applyAll() {
		const keys = Object.keys(drafts);
		if (keys.length === 0) {
			onStatus("The coordinates in the table already match the map.");
			return;
		}
		const invalid = commit(keys);
		onStatus(
			invalid > 0
				? `${invalid} ${invalid === 1 ? "coordinate needs" : "coordinates need"} correcting. The others are applied.`
				: `Coordinates applied to ${zoneName}.`
		);
	}

	const atMinimum = ring.length <= MIN_VERTICES;

	return (
		<Island
			flush
			title={`${zoneName} vertices`}
			meta={<span className="tnum">{`${ring.length} points · map units`}</span>}>
			<PreviewStateView loadingLabel="Loading vertices…" rows={5}>
				<p className="px-island-pad pt-4 pb-4 type-small text-ink-2">
					Use numeric coordinates as an accessible alternative to dragging a vertex. The selected handle is
					highlighted on the map and in this list.
				</p>
				<Table caption={`${zoneName} vertices`} className="border-t border-rule">
					<THead>
						<tr>
							<Th>Point</Th>
							<Th>X</Th>
							<Th>Y</Th>
							<Th>
								<span className="sr-only">Remove</span>
							</Th>
						</tr>
					</THead>
					<TBody>
						{ring.map(([x, y], index) => (
							<Tr key={index} selected={index === selected} onSelect={() => onSelect(index)}>
								<Td nowrap className="font-semibold">
									Vertex {index + 1}
								</Td>
								{(["x", "y"] as const).map(axis => {
									const key = draftKey(index, axis);
									const text = drafts[key];
									const value = text ?? String(axis === "x" ? x : y);
									const error = text === undefined ? null : errorOf(axis, text);
									const errorId = `vertex-${index}-${axis}-error`;
									return (
										<Td key={axis} className="min-w-24 py-2 align-top">
											<TextInput
												inputMode="numeric"
												aria-label={`Vertex ${index + 1} ${axis.toUpperCase()}`}
												value={value}
												invalid={error !== null}
												aria-describedby={error ? errorId : undefined}
												className="type-mono-data"
												onFocus={() => onSelect(index)}
												onChange={event =>
													setDrafts(current => ({ ...current, [key]: event.target.value }))
												}
												onBlur={(event: FocusEvent<HTMLInputElement>) => {
													if (
														drafts[key] !== undefined &&
														event.target.value === String(axis === "x" ? x : y)
													) {
														setDrafts(current => {
															const next = { ...current };
															delete next[key];
															return next;
														});
													} else commit([key]);
												}}
												onKeyDown={event => onFieldKey(event, key)}
											/>
											{error && (
												<p
													id={errorId}
													className="mt-1 type-small font-semibold text-attention">
													{error}
												</p>
											)}
										</Td>
									);
								})}
								<Td className="w-14">
									<IconButton
										icon="x"
										label={
											atMinimum
												? `Remove vertex ${index + 1}, a zone keeps at least ${MIN_VERTICES} vertices`
												: `Remove vertex ${index + 1}`
										}
										aria-disabled={atMinimum || undefined}
										className={cx(atMinimum && "text-ink-2")}
										onClick={() => onRemove(index)}
									/>
								</Td>
							</Tr>
						))}
					</TBody>
				</Table>
				<IslandSection rule className="flex flex-col gap-2 pt-5 pb-island-pad">
					<Button variant="ink" icon="check" fullWidth onClick={applyAll}>
						Apply coordinates
					</Button>
					{atMinimum && (
						<p className="type-small text-ink-2">A zone keeps at least {MIN_VERTICES} vertices.</p>
					)}
				</IslandSection>
			</PreviewStateView>
		</Island>
	);
}
