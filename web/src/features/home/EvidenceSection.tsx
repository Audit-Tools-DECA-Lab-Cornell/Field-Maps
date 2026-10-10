import type { ReactNode } from "react";

import { StateBadge } from "@/components/contour/StateBadge";

const POINTS: { id: string; title: string; body: ReactNode }[] = [
	{
		id: "where",
		title: "Where each observation is",
		body: (
			<>
				<p>
					In the app, every observation shows whether it is on the device, uploading or uploaded. The
					workspace counts only what has arrived, and says so.
				</p>
				<p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
					<StateBadge kind="queue" state="onDevice" />
					<StateBadge kind="queue" state="uploading" />
					<StateBadge kind="queue" state="uploaded" />
				</p>
			</>
		)
	},
	{
		id: "versions",
		title: "Versions stay visible",
		body: (
			<p>
				Each observation carries the form version that produced it. A published version is locked, so earlier
				observations are never reinterpreted.
			</p>
		)
	},
	{
		id: "counts",
		title: "Counts say what they count",
		body: (
			<p>
				Coverage shows the observations present in each zone and round, not a completion score. A count built
				from the newest 500 observations says so.
			</p>
		)
	}
];

/** What FieldMaps will and will not claim (PRODUCT.md, Honesty), for the people who answer for the data. */
export function EvidenceSection() {
	return (
		<section
			aria-labelledby="home-evidence-title"
			className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
			<div>
				<h2 id="home-evidence-title" className="type-section text-ink md:type-page">
					Evidence you can trace
				</h2>
				<p className="mt-4 max-w-xl type-lead text-ink-2">
					FieldMaps holds research evidence, so every screen says only what it knows.
				</p>
			</div>
			<ul role="list">
				{POINTS.map(point => (
					<li key={point.id} className="border-t border-line py-6 last:pb-0">
						<h3 className="type-island text-ink">{point.title}</h3>
						<div className="mt-2 type-body text-ink-2">{point.body}</div>
					</li>
				))}
			</ul>
		</section>
	);
}
