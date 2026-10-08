"use client";

import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState
} from "react";

import { Checkbox } from "@/components/contour/Checkbox";
import { IconButton } from "@/components/contour/IconButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/contour/Popover";
import { Segmented } from "@/components/contour/Segmented";
import { cx } from "@/lib/cx";
import { MAP_PALETTE_ORDER, MAP_PALETTES, mapChromeTheme, type MapPaletteName, useMapPalette } from "@/lib/map-palette";
import { fromPlan, type LngLat, type PlanPoint, type ProjectedSite, scaleChip, toPlan } from "@/lib/plan";

import { type PlanCamera, type PlanLayers, type PlanObservation, SitePlan, type ZonePlanStyle } from "./SitePlan";

/**
 * A site plan in its frame (System 9): the overlay label at the top left, zoom and Layers at the top right,
 * the scale chip at the bottom left. The frame zooms with the buttons, + and −, or Ctrl/⌘ and the wheel, and
 * pans by dragging or with the arrow keys once zoomed in. Selecting a marker reports its id; when the
 * selection changes to a marker out of view, the plan eases it into view. Layers switches the map palette
 * (separate from the screen theme) and turns zones, observations and trees on and off.
 */

export type MapFrameProps = {
	site: ProjectedSite;
	/** The overlay label's first line. Defaults to "Riverside · Day plan", naming the palette on show. */
	title?: string;
	/** The overlay label's second line. Defaults to "Map v3". */
	subtitle?: ReactNode;
	/** The map package version in the scale chip, such as "v3". */
	mapVersion: string;
	/**
	 * Pins the palette, for a gallery or an example drawn in one palette. Without it the frame shows the
	 * reader's choice, which the Layers menu changes for every map on the page.
	 */
	palette?: MapPaletteName;
	zones?: Record<string, ZonePlanStyle>;
	observations?: PlanObservation[];
	selectedId?: string | null;
	onSelectObservation?: (id: string) => void;
	/** Frame height in pixels. Without it the frame keeps the plan's proportions. */
	height?: number;
	/** island: a frame on the page (r 24). panel: a frame inside an island (r 20). */
	surface?: "island" | "panel";
	/**
	 * Placement is armed: a 2 px accent border, the overlay label in accent, panning off, and a tap on the
	 * plan reports where it landed through `onPlace`.
	 */
	armed?: boolean;
	/** Replaces the overlay label's content, such as "Tap where the play happened / One tap places the point". */
	banner?: ReactNode;
	onPlace?: (position: LngLat) => void;
	/** Zoom, pan and Layers. Off draws a still frame (print, previews) with the label and the scale chip only. */
	controls?: boolean;
	/** Zone name pills; on by default. */
	showLabels?: boolean;
	className?: string;
	/** Extra layers in plan units, drawn above the plan (vertex handles, a placed point). */
	children?: ReactNode;
};

/** Below 1 the whole plan sits smaller in the frame, with ground around it. */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
/** Each press of +, −, or a zoom button. */
const ZOOM_STEP = 1.5;
/** How far an arrow key moves the plan, as a share of the frame. */
const PAN_STEP = 0.1;
/** Pixels a pointer moves before a press becomes a drag (and stops being a click). */
const DRAG_THRESHOLD = 4;
/** A selected marker this close to the frame's edge, in plan units, is brought into view. */
const VIEW_MARGIN = 28;
/** Zone pills and markers never draw smaller than this many pixels per plan unit (pill text ≥ 13 px). */
const MIN_LABEL_SCALE = 0.9;

const AT_REST: PlanCamera = { x: 0, y: 0, zoom: 1 };

type Size = { width: number; height: number };

/** How the plan sits in the frame: pixels per plan unit, and where plan (0, 0) lands at zoom 1. */
function layoutOf(size: Size, site: ProjectedSite) {
	const scale = Math.min(size.width / site.width, size.height / site.height);
	return {
		scale,
		offsetX: (size.width - site.width * scale) / 2,
		offsetY: (size.height - site.height * scale) / 2
	};
}

/**
 * Keeps the zoom in range and the plan in sight: zoomed in, the plan always covers the frame; zoomed out, it
 * always sits wholly inside it.
 */
function clampCamera(camera: PlanCamera, site: ProjectedSite): PlanCamera {
	const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom));
	const clampAxis = (value: number, extent: number) => {
		const slack = extent * (1 - zoom);
		return Math.min(Math.max(0, slack), Math.max(Math.min(0, slack), value));
	};
	return { zoom, x: clampAxis(camera.x, site.width), y: clampAxis(camera.y, site.height) };
}

/** Zooms by `factor` about a point in frame units, keeping that point still. */
function zoomAbout(camera: PlanCamera, factor: number, [qx, qy]: PlanPoint, site: ProjectedSite): PlanCamera {
	const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * factor));
	const ratio = zoom / camera.zoom;
	return clampCamera({ zoom, x: qx - (qx - camera.x) * ratio, y: qy - (qy - camera.y) * ratio }, site);
}

/** The camera that brings a plan point into view, or null when it is already comfortably visible. */
function cameraToShow(
	camera: PlanCamera,
	[px, py]: PlanPoint,
	site: ProjectedSite,
	size: Size | null
): PlanCamera | null {
	const layout = size ? layoutOf(size, site) : { scale: 1, offsetX: 0, offsetY: 0 };
	const minX = -layout.offsetX / layout.scale + VIEW_MARGIN;
	const minY = -layout.offsetY / layout.scale + VIEW_MARGIN;
	const maxX = site.width + layout.offsetX / layout.scale - VIEW_MARGIN;
	const maxY = site.height + layout.offsetY / layout.scale - VIEW_MARGIN;
	const sx = px * camera.zoom + camera.x;
	const sy = py * camera.zoom + camera.y;
	if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) return null;
	return clampCamera(
		{ zoom: camera.zoom, x: site.width / 2 - px * camera.zoom, y: site.height / 2 - py * camera.zoom },
		site
	);
}

type Drag = { pointerId: number; startX: number; startY: number; lastX: number; lastY: number; active: boolean };

export function MapFrame({
	site,
	title,
	subtitle,
	mapVersion,
	palette: pinnedPalette,
	zones,
	observations = [],
	selectedId = null,
	onSelectObservation,
	height,
	surface = "island",
	armed = false,
	banner,
	onPlace,
	controls = true,
	showLabels = true,
	className,
	children
}: MapFrameProps) {
	const [chosenPalette, setPalette] = useMapPalette();
	const paletteName = pinnedPalette ?? chosenPalette;
	const palette = MAP_PALETTES[paletteName];
	// The label, buttons and scale chip sit on the map, so they follow its palette rather than the screen.
	const chromeTheme = mapChromeTheme(paletteName);
	const [camera, setCamera] = useState<PlanCamera>(AT_REST);
	// Buttons, keys and selection ease the camera; a drag or the wheel moves it directly.
	const [easing, setEasing] = useState(true);
	const [dragging, setDragging] = useState(false);
	const [layers, setLayers] = useState<PlanLayers>({ zones: true, observations: true, trees: true });
	const [size, setSize] = useState<Size | null>(null);
	const frameRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<Drag | null>(null);
	const ids = useId();
	const hintId = `${ids}-hint`;

	const label = title ?? `${site.name} · ${palette.label} plan`;
	const detail = subtitle ?? `Map ${mapVersion}`;

	// The frame's size decides the scale bar and how a drag maps to plan units.
	useEffect(() => {
		const frame = frameRef.current;
		if (!frame || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
		});
		observer.observe(frame);
		return () => observer.disconnect();
	}, []);

	// When the selection changes to a marker out of view, ease it in. Adjusted during render, not in an effect,
	// so the move starts in the same paint as the new selection.
	const [shownSelection, setShownSelection] = useState(selectedId);
	if (selectedId !== shownSelection) {
		setShownSelection(selectedId);
		const target = observations.find(observation => observation.id === selectedId);
		if (target) {
			const next = cameraToShow(camera, toPlan([target.lng, target.lat], site.frame), site, size);
			if (next) {
				setEasing(true);
				setCamera(next);
			}
		}
	}

	/** Brings a marker into view when it takes keyboard focus outside the visible part of the plan. */
	const showObservation = (id: string) => {
		const target = observations.find(observation => observation.id === id);
		if (!target) return;
		const point = toPlan([target.lng, target.lat], site.frame);
		setEasing(true);
		setCamera(current => cameraToShow(current, point, site, size) ?? current);
	};

	/** A point on screen in frame units (the plan's units at zoom 1). */
	const frameUnits = useCallback(
		(clientX: number, clientY: number): PlanPoint | null => {
			const frame = frameRef.current;
			if (!frame) return null;
			const rect = frame.getBoundingClientRect();
			const layout = layoutOf({ width: rect.width, height: rect.height }, site);
			return [
				(clientX - rect.left - layout.offsetX) / layout.scale,
				(clientY - rect.top - layout.offsetY) / layout.scale
			];
		},
		[site]
	);

	const zoomBy = useCallback(
		(factor: number) => {
			setEasing(true);
			setCamera(current => zoomAbout(current, factor, [site.width / 2, site.height / 2], site));
		},
		[site]
	);

	// Ctrl or ⌘ with the wheel (and a trackpad pinch, which arrives the same way) zooms about the pointer. A
	// plain wheel scrolls the page. React's wheel listener is passive, so this one is attached by hand.
	useEffect(() => {
		const frame = frameRef.current;
		if (!frame || !controls) return;
		const onWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) return;
			event.preventDefault();
			const point = frameUnits(event.clientX, event.clientY);
			if (!point) return;
			const factor = Math.exp(-event.deltaY * 0.0025);
			setEasing(false);
			setCamera(current => zoomAbout(current, factor, point, site));
		};
		frame.addEventListener("wheel", onWheel, { passive: false });
		return () => frame.removeEventListener("wheel", onWheel);
	}, [controls, frameUnits, site]);

	const canPan = controls && !armed && camera.zoom > 1;

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		// Keys typed in the Layers menu reach here through the React tree; only the frame's own keys count.
		if (!controls || !event.currentTarget.contains(event.target as Node)) return;
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const panX = site.width * PAN_STEP;
		const panY = site.height * PAN_STEP;
		const pan = (dx: number, dy: number) => {
			setEasing(true);
			setCamera(current => clampCamera({ ...current, x: current.x + dx, y: current.y + dy }, site));
		};
		// With nowhere to pan, an arrow key returns before preventDefault and scrolls the page as usual.
		if (event.key.startsWith("Arrow") && !canPan) return;
		switch (event.key) {
			case "+":
			case "=":
				zoomBy(ZOOM_STEP);
				break;
			case "-":
			case "_":
				zoomBy(1 / ZOOM_STEP);
				break;
			case "ArrowLeft":
				pan(panX, 0);
				break;
			case "ArrowRight":
				pan(-panX, 0);
				break;
			case "ArrowUp":
				pan(0, panY);
				break;
			case "ArrowDown":
				pan(0, -panY);
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!controls || event.button !== 0) return;
		// The overlay controls handle their own presses.
		if ((event.target as Element).closest("[data-map-overlay]")) return;
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			lastX: event.clientX,
			lastY: event.clientY,
			active: false
		};
	};

	const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId || !canPan) return;
		if (!drag.active) {
			if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) return;
			// Capture only once this is a drag, so a plain press still clicks the marker under it.
			drag.active = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			setDragging(true);
			setEasing(false);
		}
		const scale = size ? layoutOf(size, site).scale : 1;
		const dx = (event.clientX - drag.lastX) / scale;
		const dy = (event.clientY - drag.lastY) / scale;
		drag.lastX = event.clientX;
		drag.lastY = event.clientY;
		setCamera(current => clampCamera({ ...current, x: current.x + dx, y: current.y + dy }, site));
	};

	const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		dragRef.current = null;
		if (drag.active) {
			setDragging(false);
			return;
		}
		if (!cancelled && armed && onPlace) {
			const point = frameUnits(event.clientX, event.clientY);
			if (!point) return;
			const onPlan: PlanPoint = [(point[0] - camera.x) / camera.zoom, (point[1] - camera.y) / camera.zoom];
			onPlace(fromPlan(onPlan, site.frame));
		}
	};

	const layout = size ? layoutOf(size, site) : null;
	const scale = scaleChip(
		layout ? layout.scale * site.width : site.width,
		site.width * site.metresPerUnit,
		camera.zoom
	);

	const labelScale = layout ? Math.max(1, MIN_LABEL_SCALE / layout.scale) : 1;

	const shownObservations = observations.map(observation => ({
		...observation,
		selected: observation.id === selectedId
	}));

	const setLayer = (key: keyof PlanLayers) => (checked: boolean) =>
		setLayers(current => ({ ...current, [key]: checked }));

	return (
		<div
			ref={frameRef}
			role={controls ? "group" : undefined}
			aria-roledescription={controls ? "map" : undefined}
			aria-label={controls ? label : undefined}
			aria-describedby={controls ? hintId : undefined}
			tabIndex={controls ? 0 : undefined}
			onKeyDown={onKeyDown}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={event => endDrag(event, false)}
			onPointerCancel={event => endDrag(event, true)}
			className={cx(
				"@container relative isolate overflow-hidden",
				surface === "island" ? "rounded-island" : "rounded-panel",
				armed ? "border-2 border-accent" : "border border-line",
				canPan && (dragging ? "cursor-grabbing touch-none" : "cursor-grab touch-none"),
				armed && onPlace && "cursor-crosshair",
				className
			)}
			style={{
				backgroundColor: palette.background,
				...(height ? { height } : { aspectRatio: `${site.width} / ${site.height}` })
			}}>
			<SitePlan
				site={site}
				palette={paletteName}
				zones={zones}
				observations={shownObservations}
				showLabels={showLabels}
				layers={layers}
				title={label}
				className="absolute inset-0 size-full"
				camera={camera}
				animateCamera={easing && !dragging}
				labelScale={labelScale}
				onSelectObservation={controls ? onSelectObservation : undefined}
				onFocusObservation={controls ? showObservation : undefined}>
				{children}
			</SitePlan>

			{/* The label and the controls share one row, so a narrow frame wraps the label rather than overlapping. */}
			<div
				data-theme={chromeTheme}
				className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
				<div
					data-map-overlay
					className={cx(
						"pointer-events-auto min-w-0 max-w-80 rounded-thumb border px-4 py-2 shadow-ledge",
						armed ? "border-accent bg-accent text-on-accent" : "border-line bg-island text-ink"
					)}>
					{banner ?? (
						<>
							<p className="type-small font-semibold">{label}</p>
							{/* A phone-width frame keeps only the first line, so the plan stays visible. */}
							<p className={cx("type-small @max-sm:hidden", armed ? "text-on-accent" : "text-ink-2")}>
								{detail}
							</p>
						</>
					)}
				</div>

				{controls && (
					<div data-map-overlay className="pointer-events-auto flex shrink-0 gap-2">
						<IconButton
							icon="plus"
							label="Zoom in"
							variant="map"
							className="shadow-ledge"
							disabled={camera.zoom >= MAX_ZOOM}
							onClick={() => zoomBy(ZOOM_STEP)}
						/>
						<IconButton
							icon="minus"
							label="Zoom out"
							variant="map"
							className="shadow-ledge"
							disabled={camera.zoom <= MIN_ZOOM}
							onClick={() => zoomBy(1 / ZOOM_STEP)}
						/>
						<Popover>
							<PopoverTrigger asChild>
								<IconButton
									icon="layers"
									label="Map layers"
									variant="map"
									active
									className="shadow-ledge"
								/>
							</PopoverTrigger>
							{/* Portalled to the page, so the menu takes the screen theme like any other menu. */}
							<PopoverContent align="end" className="w-72">
								<LayersMenu
									idPrefix={ids}
									palette={pinnedPalette ? undefined : paletteName}
									onPaletteChange={setPalette}
									layers={layers}
									onLayerChange={setLayer}
								/>
							</PopoverContent>
						</Popover>
					</div>
				)}
			</div>

			<div
				data-map-overlay
				data-theme={chromeTheme}
				className="absolute bottom-3 left-3 inline-flex items-center gap-4 rounded-pill border border-line bg-island px-4 py-1.5 text-ink shadow-ledge">
				<span className="flex flex-col items-center gap-0.5" aria-hidden="true">
					<span className="type-mono-data">{scale.label}</span>
					<span className="block h-0.5 bg-ink" style={{ width: scale.px }} />
				</span>
				<span className="type-mono-data" aria-hidden="true">
					Map {mapVersion} · north ↑
				</span>
				<span className="sr-only">
					Scale bar {scale.label}. Map {mapVersion}. North is up.
				</span>
			</div>

			{controls && (
				<p id={hintId} className="sr-only">
					Zoom with plus and minus, or Control and the mouse wheel. Once zoomed in, drag or use the arrow keys
					to move the plan.
				</p>
			)}
		</div>
	);
}

/** The Layers menu: the map palette (its own setting, separate from the screen theme) and the layer toggles. */
function LayersMenu({
	idPrefix,
	palette,
	onPaletteChange,
	layers,
	onLayerChange
}: {
	idPrefix: string;
	/** The palette choice; left out when the frame's palette is pinned. */
	palette: MapPaletteName | undefined;
	onPaletteChange: (name: MapPaletteName) => void;
	layers: PlanLayers;
	onLayerChange: (key: keyof PlanLayers) => (checked: boolean) => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			{palette && (
				<div className="flex flex-col gap-2 border-b border-rule pb-4">
					<p className="type-mono-label text-ink-2">Map palette</p>
					<Segmented
						label="Map palette"
						value={palette}
						onValueChange={value => onPaletteChange(value as MapPaletteName)}
						options={MAP_PALETTE_ORDER.map(name => ({ value: name, label: MAP_PALETTES[name].label }))}
						fullWidth
					/>
					<p className="type-small text-ink-2">Separate from the screen theme.</p>
				</div>
			)}
			<div className="flex flex-col gap-1">
				<p className="type-mono-label text-ink-2">Layers</p>
				<Checkbox
					id={`${idPrefix}-zones`}
					checked={layers.zones}
					onCheckedChange={onLayerChange("zones")}
					className="py-2">
					Zones
				</Checkbox>
				<Checkbox
					id={`${idPrefix}-observations`}
					checked={layers.observations}
					onCheckedChange={onLayerChange("observations")}
					className="py-2">
					Observations
				</Checkbox>
				<Checkbox
					id={`${idPrefix}-trees`}
					checked={layers.trees}
					onCheckedChange={onLayerChange("trees")}
					className="py-2">
					Trees
				</Checkbox>
			</div>
		</div>
	);
}
