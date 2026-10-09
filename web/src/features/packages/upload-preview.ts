import { type LayerName, type LayerSlotState, looksProjected } from "@/lib/packages";
import type { ProjectedSite } from "@/lib/plan";
import { type CollectionLayers, layersPlan } from "@/lib/sites/archive";

/**
 * A plan of the layers chosen on the Upload step, drawn in this browser before anything is sent, so a
 * manager sees the export on the same kind of plan observers will get. Ground draws as grass (or its own
 * surface kind), zones as zones, paths as paths and trees as trees (`layersPlan`). A layer in projected
 * coordinates is left out, since it would be drawn far from the rest; anything the plan cannot read is
 * left out too.
 */
export function previewPlan(name: string, slots: Record<LayerName, LayerSlotState>): ProjectedSite | null {
	const layers: { -readonly [Name in LayerName]?: CollectionLayers[Name] } = {};
	for (const layer of ["ground", "paths", "trees", "zones"] as const) {
		const slot = slots[layer];
		if (slot.kind !== "ready") continue;
		if (slot.analysis.bbox && looksProjected(slot.analysis.bbox)) continue;
		layers[layer] = slot.collection;
	}
	try {
		return layersPlan(name, layers);
	} catch {
		// A layer the plan cannot read (the checks name the cause) shows no plan, not an error.
		return null;
	}
}
