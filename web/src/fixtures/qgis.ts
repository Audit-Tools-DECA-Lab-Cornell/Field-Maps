import type { CodebookField, ReaderGrant } from "./types";

/** Scoped, read-only QGIS access. The reader sees typed views of accepted observations only. */
export const READER_GRANTS: ReaderGrant[] = [
	{ reader: "Research analyst", scope: "Play Study only", privilege: "Read only · typed views", expiry: "Nov 30" }
];

/** Shipped with every export as the codebook. */
export const CODEBOOK: CodebookField[] = [
	{ column: "observation_id", type: "text", meaning: "Stable observation identity" },
	{ column: "round", type: "integer", meaning: "Observer-selected round" },
	{ column: "observer", type: "text", meaning: "Capture-time observer code" },
	{ column: "form_version", type: "text", meaning: "Immutable answer interpretation" },
	{ column: "geometry", type: "point", meaning: "Observed location, not device GPS" }
];

export const FIELD_TYPES = "Point geometry · integer round · text observer";
