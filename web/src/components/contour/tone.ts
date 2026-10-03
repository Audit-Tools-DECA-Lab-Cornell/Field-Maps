import type { StateTone } from "@/lib/contour";

export type { StateTone as Tone } from "@/lib/contour";

/** The strong colour of a tone: glyphs and state words (Rule 02 pairs it with a glyph and a word). */
export const TONE_TEXT: Record<StateTone, string> = {
	saved: "text-saved",
	waiting: "text-waiting",
	uploaded: "text-uploaded",
	attention: "text-attention",
	held: "text-held",
	ink: "text-ink",
	accent: "text-accent"
};

/** The soft fill of a tone: notes, the needs-attention row, chip grounds. */
export const TONE_SOFT: Record<StateTone, string> = {
	saved: "bg-saved-soft",
	waiting: "bg-waiting-soft",
	uploaded: "bg-uploaded-soft",
	attention: "bg-attention-soft",
	held: "bg-held-soft",
	ink: "bg-well",
	accent: "bg-accent-soft"
};

/** A border in the tone's strong colour, for the danger island and the attention input. */
export const TONE_BORDER: Record<StateTone, string> = {
	saved: "border-saved",
	waiting: "border-waiting",
	uploaded: "border-uploaded",
	attention: "border-attention",
	held: "border-held",
	ink: "border-ink",
	accent: "border-accent"
};
