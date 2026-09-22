import type { ChipTone } from "@/components/nocturne/chrome";
import type { PrepState, RecordState, SiteState } from "@/types/domain";

/**
 * One vocabulary of state for the whole product.
 *
 * State is a glyph plus a word plus a colour, in that order of importance, so the colour is never
 * load-bearing: the chip still reads in greyscale, on a sunlit tablet, and to someone who cannot
 * separate the two tints. The collector's `Chip` carries the same four tones.
 */

export interface StateBadge {
	readonly glyph: string;
	readonly label: string;
	readonly tone: ChipTone;
	readonly meaning: string;
}

export const RECORD_STATES: Record<RecordState, StateBadge> = {
	"in-database": {
		glyph: "✓",
		label: "In database",
		tone: "accent",
		meaning: "Committed by the API. QGIS reads it on the next layer refresh."
	},
	revised: {
		glyph: "◷",
		label: "Revised",
		tone: "live",
		meaning: "A later revision was accepted. Earlier revisions are kept; nothing is overwritten."
	},
	flagged: {
		glyph: "⚠",
		label: "Flagged",
		tone: "attention",
		meaning: "A computed check fired. The record is unchanged and still exports."
	},
	withdrawn: {
		glyph: "◼",
		label: "Withdrawn",
		tone: "muted",
		meaning: "Marked deleted by the observer. The row is kept and excluded from analysis."
	}
};

export const SITE_STATES: Record<SiteState, StateBadge> = {
	collecting: {
		glyph: "✓",
		label: "Collecting",
		tone: "accent",
		meaning: "Observers are assigned and rounds are scheduled."
	},
	configured: {
		glyph: "▣",
		label: "Configured",
		tone: "muted",
		meaning: "Zones are drawn, but no rounds and no observers yet."
	},
	blocked: {
		glyph: "◼",
		label: "Blocked",
		tone: "attention",
		meaning: "Something has to be resolved before collection can start."
	}
};

export const PREP_STATES: Record<PrepState, StateBadge> = {
	done: { glyph: "✓", label: "Done", tone: "accent", meaning: "This step passed." },
	warning: {
		glyph: "⚠",
		label: "Needs attention",
		tone: "attention",
		meaning: "This step passed with something unresolved."
	},
	blocked: { glyph: "◼", label: "Blocked", tone: "attention", meaning: "This step cannot pass as configured." },
	waiting: { glyph: "—", label: "Not started", tone: "muted", meaning: "Waiting on an earlier step." }
};
