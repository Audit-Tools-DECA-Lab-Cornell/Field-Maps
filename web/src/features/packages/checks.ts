import type { PreparationCheck } from "@/lib/api/types";

/** What each of DECA Mark's own checks looks at, in plain words (the API names them by step). */
export const CHECK_STEP: Record<PreparationCheck["step"], string> = {
	"source-project": "QGIS project",
	"layer-sources": "Layers",
	"coordinate-reference": "Coordinates",
	"imagery-licence": "Imagery licence",
	archive: "Package file"
};
