import { shapeForPlayType } from "@/data/instrument";
import type { RecordState } from "@/types/domain";

/**
 * A marker carries two facts at once: its shape is the play type and its fill is the record state.
 * Both are redundant with the table beside it, and neither is colour alone — the shape survives
 * greyscale, and the halo is what keeps either legible over the plan base and over street tiles.
 */

const FILLS: Record<RecordState, string> = {
	"in-database": "var(--color-accent-400)",
	revised: "var(--color-live)",
	flagged: "var(--color-attention)",
	withdrawn: "var(--color-neutral-600)"
};

/**
 * Mark geometry, named once.
 *
 * Nocturne has no token for a map mark — the collector draws its markers through MapLibre, which
 * takes its own numbers — so these cannot come from the shared scale without inventing a token the
 * other application would not use. Naming them here instead is what stops the map and its key
 * disagreeing: anything that draws one of these shapes reads its size from this object.
 */
export const MARKER = {
	/** The icon box Leaflet positions and centres the shape inside. */
	box: 18,
	/** The shape itself. */
	shape: 9,
	/** The ring that keeps a mark legible over the plan base and over street tiles alike. */
	halo: 2,
	haloSelected: 2.5,
	/** Barely rounded: a square has to stay readably a square at 9 px. */
	corner: 1.5
} as const;

export function markerHtml(playType: string, state: RecordState, selected: boolean): string {
	const shape = shapeForPlayType(playType);
	const fill = FILLS[state];
	const halo = selected ? "var(--color-accent-100)" : "var(--color-bg)";
	const haloWidth = selected ? MARKER.haloSelected : MARKER.halo;
	const size = MARKER.shape;

	const common = `width:${size}px;height:${size}px;background:${fill};box-shadow:0 0 0 ${haloWidth}px ${halo};`;
	const inner =
		shape === "circle"
			? `<span style="${common}border-radius:50%;display:block"></span>`
			: shape === "square"
				? `<span style="${common}border-radius:${MARKER.corner}px;display:block"></span>`
				: shape === "diamond"
					? `<span style="${common}border-radius:${MARKER.corner}px;display:block;transform:rotate(45deg)"></span>`
					: // A triangle cannot carry a box-shadow halo, so it takes a ring behind it instead.
						`<span style="display:grid;place-items:center;width:${size + haloWidth * 2}px;height:${size + haloWidth * 2}px;border-radius:${MARKER.corner}px;background:${halo}"><span style="display:block;width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${fill}"></span></span>`;

	return `<span style="display:grid;place-items:center;width:${MARKER.box}px;height:${MARKER.box}px">${inner}</span>`;
}
