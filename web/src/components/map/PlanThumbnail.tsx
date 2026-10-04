import { cx } from "@/lib/cx";
import type { MapPaletteName } from "@/lib/map-palette";
import type { ProjectedSite } from "@/lib/plan";

import { SitePlan, type ZonePlanStyle } from "./SitePlan";

export type PlanThumbnailProps = {
	site: ProjectedSite;
	/** Day unless the thumbnail illustrates a palette choice. */
	palette?: MapPaletteName;
	/** Hatch or fade zones, as on the full map. Labels never show at this size. */
	zones?: Record<string, ZonePlanStyle>;
	/** The thumbnail's accessible name. Leave it out when the site's name is written beside it. */
	title?: string;
	className?: string;
};

/**
 * A small still plan for site rows (Project 6) and the palette cards in preferences: the whole site with no
 * labels, markers or controls, in a 14 px rounded frame at the plan's proportions. Width comes from the
 * caller (`w-40` in a site row); the height follows.
 */
export function PlanThumbnail({ site, palette = "day", zones, title, className }: PlanThumbnailProps) {
	const plan = (
		<SitePlan
			site={site}
			palette={palette}
			zones={zones}
			showLabels={false}
			detail="thumbnail"
			title={title ?? `${site.name} plan`}
			fit="slice"
			className="size-full"
		/>
	);
	return (
		<div
			className={cx("overflow-hidden rounded-thumb border border-line", className)}
			style={{ aspectRatio: `${site.width} / ${site.height}` }}
			aria-hidden={title ? undefined : true}>
			{plan}
		</div>
	);
}
