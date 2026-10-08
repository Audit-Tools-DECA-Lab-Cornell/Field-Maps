import { type LayerName, type LayerSlotState, looksProjected } from "@/lib/packages";
import { parseSite, type ProjectedSite, projectSite, type SiteFeature } from "@/lib/plan";
import type { Feature } from "@/types/geojson";

/**
 * A plan of the layers chosen on the Upload step, read in the browser before anything is sent, so a
 * manager sees the export on the same kind of plan observers will get. Ground polygons draw as grass (or
 * their own surface kind when the export names one), zones as zones, paths as paths and point trees as
 * trees. Anything the plan cannot read is left out; a layer in projected coordinates is not drawn at all.
 */

const SURFACES = ["grass", "mulch", "dirt", "blacktop", "path"] as const;
type Surface = (typeof SURFACES)[number];

function surfaceOf(properties: Record<string, unknown>): Surface {
	for (const key of ["kind", "surface", "type", "material"]) {
		const value = properties[key];
		if (typeof value === "string" && SURFACES.includes(value.toLowerCase() as Surface))
			return value.toLowerCase() as Surface;
	}
	return "grass";
}

function nameOf(properties: Record<string, unknown>, index: number): string {
	for (const key of ["name", "zone", "label", "id"]) {
		const value = properties[key];
		if (typeof value === "string" && value !== "") return value;
		if (typeof value === "number") return String(value);
	}
	return `Zone ${index + 1}`;
}

function toFeature(layer: LayerName, feature: Feature, index: number): SiteFeature | null {
	const id = `${layer}-${index + 1}`;
	const { geometry, properties } = feature;
	if (layer === "zones" && geometry.type === "Polygon")
		return {
			type: "Feature",
			properties: { kind: "zone", id, name: nameOf(properties, index) },
			geometry: geometry as SiteFeature["geometry"]
		};
	if (layer === "ground" && geometry.type === "Polygon")
		return {
			type: "Feature",
			properties: { kind: surfaceOf(properties), id },
			geometry: geometry as SiteFeature["geometry"]
		};
	if (layer === "paths" && geometry.type === "LineString")
		return { type: "Feature", properties: { kind: "path", id }, geometry: geometry as SiteFeature["geometry"] };
	if (layer === "trees" && geometry.type === "Point")
		return { type: "Feature", properties: { kind: "tree", id }, geometry: geometry as SiteFeature["geometry"] };
	return null;
}

/** The chosen layers as a plan, or null when there is nothing drawable yet. */
export function previewPlan(name: string, slots: Record<LayerName, LayerSlotState>): ProjectedSite | null {
	const features: SiteFeature[] = [];
	// Ground first, then paths, trees and zones on top, the order the plan draws them in.
	for (const layer of ["ground", "paths", "trees", "zones"] as const) {
		const slot = slots[layer];
		if (slot.kind !== "ready") continue;
		if (slot.analysis.bbox && looksProjected(slot.analysis.bbox)) continue;
		slot.collection.features.forEach((feature, index) => {
			const converted = toFeature(layer, feature, index);
			if (converted) features.push(converted);
		});
	}
	if (features.length === 0) return null;
	try {
		return projectSite(parseSite({ type: "FeatureCollection", name, features }));
	} catch {
		return null;
	}
}
