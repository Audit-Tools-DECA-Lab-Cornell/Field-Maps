import { PlanThumbnail } from "@/components/map/PlanThumbnail";
import type { PlanObservation, ZonePlanStyle } from "@/components/map/SitePlan";
import { fromPlan, type PlanPoint, type ProjectedSite } from "@/lib/plan";
import { loadProjectedSite } from "@/lib/plan-sites";

import { Specimen } from "./GalleryParts";
import { SelectableMap } from "./SelectableMap";

/** Project 7's coverage dots, with North meadow hatched as the zone in focus (Project 8). */
const DAY_ZONES: Record<string, ZonePlanStyle> = {
	"zone-a": { dots: [true, true, false], hatched: true, emphasis: "focus" },
	"zone-b": { dots: [true, true, true] },
	"zone-c": { dots: [false, false, false] }
};

/** System 8: the same dots, nothing hatched. */
const NIGHT_ZONES: Record<string, ZonePlanStyle> = {
	"zone-a": { dots: [true, true, false] },
	"zone-b": { dots: [true, true, true] },
	"zone-c": { dots: [false, false, false] }
};

/**
 * The fourteen records where Project 2 draws them, read off its map in plan units: North meadow 7,
 * Woodland edge 6, Sand area 1.
 */
const RECORDS: { id: string; at: PlanPoint; label: string }[] = [
	{ id: "OBS-0244", at: [267, 330], label: "Woodland edge, Round 3" },
	{ id: "OBS-0243", at: [213, 314], label: "Woodland edge, Round 3" },
	{ id: "OBS-0242", at: [204, 156], label: "North meadow, Round 1" },
	{ id: "OBS-0241", at: [148, 317], label: "Woodland edge, Round 2" },
	{ id: "OBS-0240", at: [249, 190], label: "North meadow, Round 1" },
	{ id: "OBS-0239", at: [285, 371], label: "Woodland edge, Round 2" },
	{ id: "OBS-0238", at: [329, 176], label: "North meadow, Round 2" },
	{ id: "OBS-0237", at: [551, 323], label: "Sand area, Round 1" },
	{ id: "OBS-0236", at: [383, 195], label: "North meadow, Round 1" },
	{ id: "OBS-0235", at: [420, 126], label: "North meadow, Round 2" },
	{ id: "OBS-0234", at: [461, 171], label: "North meadow, Round 1" },
	{ id: "OBS-0233", at: [170, 390], label: "Woodland edge, Round 1" },
	{ id: "OBS-0232", at: [499, 139], label: "North meadow, Round 2" },
	{ id: "OBS-0231", at: [232, 394], label: "Woodland edge, Round 1" }
];

function observationsFor(site: ProjectedSite): PlanObservation[] {
	return RECORDS.map(({ id, at, label }) => {
		const [lng, lat] = fromPlan(at, site.frame);
		return { id, lng, lat, label: `${id}, ${label}` };
	});
}

/**
 * The map primitives against System 9, Project 7 and System 8: a Day frame that follows the reader's
 * palette, a frame pinned to Night, Fall Creek fitted to its own features, and the site thumbnails. The
 * fixtures load here, on the server, and reach the frames as props.
 */
export function MapSpecimens() {
	const riverside = loadProjectedSite("riverside");
	const fallCreek = loadProjectedSite("fall-creek");
	const practice = loadProjectedSite("practice-garden");
	const observations = observationsFor(riverside);

	return (
		<>
			<div className="grid gap-x-8 gap-y-10 xl:grid-cols-2">
				<Specimen
					title="Map frame · reader's palette"
					caption="Day by default. Layers switches the palette for every unpinned map on the page; the screen theme never does.">
					<SelectableMap
						site={riverside}
						mapVersion="v3"
						subtitle="Dots show rounds that met the target"
						zones={DAY_ZONES}
						observations={observations}
						selectedId="OBS-0244"
						picker
					/>
				</Specimen>
				<Specimen
					title="Map frame · pinned to Night"
					caption="The label, buttons and scale chip take Dusk chrome from the palette, even on a Day page.">
					<SelectableMap
						site={riverside}
						palette="night"
						mapVersion="v3"
						subtitle="Dots show rounds that met the target"
						zones={NIGHT_ZONES}
						observations={observations}
					/>
				</Specimen>
			</div>
			<div className="grid gap-x-8 gap-y-10 xl:grid-cols-2">
				<Specimen
					title="Fall Creek · fitted"
					caption="The collector's QGIS drawings, with no stored frame: the plan fits itself to the features.">
					<SelectableMap site={fallCreek} mapVersion="v1" subtitle="Whole playground · 1 zone" />
				</Specimen>
				<Specimen title="Thumbnails" caption="Still plans for site rows and the palette cards in preferences.">
					<ul className="flex flex-wrap gap-6">
						{[riverside, fallCreek, practice].map(site => (
							<li key={site.name} className="flex flex-col gap-2">
								<PlanThumbnail site={site} className="w-40" />
								<span className="type-small text-ink-2">{site.name}</span>
							</li>
						))}
						<li className="flex flex-col gap-2">
							<PlanThumbnail site={riverside} palette="night" className="w-40" />
							<span className="type-small text-ink-2">Riverside, Night</span>
						</li>
					</ul>
				</Specimen>
			</div>
		</>
	);
}
