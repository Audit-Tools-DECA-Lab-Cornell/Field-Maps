import { cx } from "@/lib/cx";

/*
 * Class strings that several primitives share. They live in a plain module, not in a "use client" one, so a
 * server component that imports them gets the strings themselves rather than client references.
 */

/** How a pressable control changes on hover and press: colour, fill, edge and opacity over the quick duration. */
export const CONTROL_TRANSITION =
	"transition-[color,background-color,border-color,opacity,transform] duration-(--ct-duration-quick) ease-standard";

/** The floating island surface that menus and popovers share: island fill, fine edge, the ledge. */
export const MENU_SURFACE = "rounded-panel border border-line bg-island text-ink shadow-ledge";

/** How a menu or popover opens and closes, keyed to Radix's data-state. Reduced motion is handled globally. */
export const OVERLAY_MOTION = "data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

/**
 * The frame every Contour text control shares: a 2 px ink edge, the input radius and the island fill.
 * Invalid takes the attention edge; read-only sits in the well with a quiet edge and secondary ink.
 * Size and padding are the control's own. Focus uses the global ring.
 */
export function controlFrame({ invalid = false, readOnly = false }: { invalid?: boolean; readOnly?: boolean }) {
	return cx(
		"w-full rounded-input border-2 placeholder:text-ink-2",
		"transition-[color,background-color,border-color] duration-(--ct-duration-quick) ease-standard",
		"disabled:cursor-not-allowed disabled:opacity-50",
		readOnly ? "bg-well text-ink-2" : "bg-island text-ink",
		invalid ? "border-attention" : readOnly ? "border-line" : "border-ink"
	);
}
