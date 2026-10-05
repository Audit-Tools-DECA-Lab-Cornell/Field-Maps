"use client";

import { type KeyboardEvent, type PointerEvent, type RefObject, useEffect, useRef, useState } from "react";

import type { ZoneRing } from "@/features/packages/store";

/**
 * The zone editor's vertex handles (project-09), drawn inside the site plan in plan units. Each handle is a
 * focusable button named by its place ("Vertex 3, x 544, y 208"): drag it with a pointer, nudge it with
 * the arrow keys (Shift for 10 map units), or remove it with Delete while the zone keeps three vertices.
 * Handles keep their size on screen while the plan zooms under them.
 */

/** Visible square and pressable square, in screen pixels. */
const HANDLE_PX = 13;
const SELECTED_PX = 17;
const HIT_PX = 28;

export type VertexHandlesProps = {
	ring: ZoneRing;
	selected: number | null;
	/** Plan size: a vertex stays inside it. */
	width: number;
	height: number;
	onSelect: (index: number) => void;
	/** A drag or a nudge is starting: the editor records an undo step once for the whole gesture. */
	onBegin: () => void;
	onMove: (index: number, point: [number, number]) => void;
	onRemove: (index: number) => void;
};

/** Plan units per screen pixel at the plan's current zoom, so a handle keeps one size on screen. */
function useUnitsPerPixel(groupRef: RefObject<SVGGElement | null>): number {
	const [unitsPerPixel, setUnitsPerPixel] = useState(1);
	useEffect(() => {
		const group = groupRef.current;
		const svg = group?.ownerSVGElement;
		const camera = group?.parentElement;
		if (!group || !svg || !camera) return;
		const measure = () => {
			const screen = svg.getScreenCTM();
			const zoom = Number(/scale\(([\d.]+)\)/.exec(camera.style.transform)?.[1] ?? 1);
			if (screen && screen.a > 0) setUnitsPerPixel(1 / (screen.a * zoom));
		};
		measure();
		const mutations = new MutationObserver(measure);
		mutations.observe(camera, { attributes: true, attributeFilter: ["style"] });
		const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
		resize?.observe(svg);
		return () => {
			mutations.disconnect();
			resize?.disconnect();
		};
	}, [groupRef]);
	return unitsPerPixel;
}

export function VertexHandles({
	ring,
	selected,
	width,
	height,
	onSelect,
	onBegin,
	onMove,
	onRemove
}: VertexHandlesProps) {
	const groupRef = useRef<SVGGElement>(null);
	const dragRef = useRef<{ pointerId: number; index: number } | null>(null);
	const unitsPerPixel = useUnitsPerPixel(groupRef);

	function planPoint(clientX: number, clientY: number): [number, number] | null {
		const matrix = groupRef.current?.getScreenCTM();
		if (!matrix) return null;
		const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
		return [Math.round(Math.min(width, Math.max(0, point.x))), Math.round(Math.min(height, Math.max(0, point.y)))];
	}

	function onPointerDown(event: PointerEvent<SVGGElement>, index: number) {
		if (event.button !== 0) return;
		// The handle owns this press: the map frame must not start panning under it.
		event.stopPropagation();
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		event.currentTarget.focus({ preventScroll: true });
		dragRef.current = { pointerId: event.pointerId, index };
		onSelect(index);
		onBegin();
	}

	function onPointerMove(event: PointerEvent<SVGGElement>) {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.stopPropagation();
		const point = planPoint(event.clientX, event.clientY);
		if (point) onMove(drag.index, point);
	}

	function endDrag(event: PointerEvent<SVGGElement>) {
		if (dragRef.current?.pointerId !== event.pointerId) return;
		event.stopPropagation();
		dragRef.current = null;
	}

	function onKeyDown(event: KeyboardEvent<SVGGElement>, index: number) {
		const step = event.shiftKey ? 10 : 1;
		const [x, y] = ring[index] ?? [0, 0];
		let next: [number, number] | null = null;
		switch (event.key) {
			case "ArrowLeft":
				next = [x - step, y];
				break;
			case "ArrowRight":
				next = [x + step, y];
				break;
			case "ArrowUp":
				next = [x, y - step];
				break;
			case "ArrowDown":
				next = [x, y + step];
				break;
			case "Delete":
			case "Backspace":
				event.preventDefault();
				event.stopPropagation();
				onRemove(index);
				return;
			case "Enter":
			case " ":
				event.preventDefault();
				event.stopPropagation();
				onSelect(index);
				return;
			default:
				return;
		}
		// Arrows move the vertex, not the plan or the page.
		event.preventDefault();
		event.stopPropagation();
		onBegin();
		onMove(index, [Math.min(width, Math.max(0, next[0])), Math.min(height, Math.max(0, next[1]))]);
	}

	return (
		<g ref={groupRef}>
			{ring.map(([x, y], index) => {
				const isSelected = index === selected;
				const size = (isSelected ? SELECTED_PX : HANDLE_PX) * unitsPerPixel;
				const hit = HIT_PX * unitsPerPixel;
				return (
					<g
						key={index}
						data-map-overlay
						role="button"
						tabIndex={0}
						aria-label={`Vertex ${index + 1}, x ${x}, y ${y}`}
						aria-pressed={isSelected}
						aria-roledescription="draggable vertex"
						transform={`translate(${x} ${y})`}
						className="group/vertex cursor-move touch-none"
						style={{ outline: "none" }}
						onFocus={() => onSelect(index)}
						onPointerDown={event => onPointerDown(event, index)}
						onPointerMove={onPointerMove}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
						onKeyDown={event => onKeyDown(event, index)}>
						<rect x={-hit / 2} y={-hit / 2} width={hit} height={hit} fill="transparent" />
						<rect
							x={-size / 2}
							y={-size / 2}
							width={size}
							height={size}
							rx={2.5 * unitsPerPixel}
							strokeWidth={2.4}
							vectorEffect="non-scaling-stroke"
							className={isSelected ? "fill-ink stroke-island" : "fill-island stroke-ink"}
						/>
						{/* The focus ring: 3 px, clear of the square, for keyboard focus only. */}
						<rect
							x={-size / 2 - 5 * unitsPerPixel}
							y={-size / 2 - 5 * unitsPerPixel}
							width={size + 10 * unitsPerPixel}
							height={size + 10 * unitsPerPixel}
							rx={4 * unitsPerPixel}
							fill="none"
							strokeWidth={3}
							vectorEffect="non-scaling-stroke"
							className="stroke-focus opacity-0 group-focus-visible/vertex:opacity-100"
						/>
					</g>
				);
			})}
		</g>
	);
}
