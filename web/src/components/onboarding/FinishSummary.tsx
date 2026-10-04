"use client";

import { GhostAction, LinkAction } from "@/components/nocturne/chrome";

const CHECKLIST: readonly string[] = [
	"The organization, with you as its owner",
	"The project",
	"A Training membership for every observer who joins",
	"The site, awaiting its QGIS package",
	"The form, saved as a draft",
	"The invitation, with its code, uses and expiry"
];

/** The closing screen. Nothing here was created — it says so twice, once above the list and once below it. */
export function FinishSummary({ onStartAgain }: { readonly onStartAgain: () => void }) {
	return (
		<div className="flex flex-col gap-loose">
			<p className="text-detail text-neutral-300">In the live version, finishing creates:</p>

			<ul className="flex flex-col gap-tight">
				{CHECKLIST.map(item => (
					<li key={item} className="flex items-start gap-snug text-detail text-neutral-300">
						<span aria-hidden className="mt-[2px] text-accent-300">
							✓
						</span>
						<span>{item}</span>
					</li>
				))}
			</ul>

			<p className="text-micro text-neutral-500">
				Nothing above has been created. This page previews the flow; saving organizations and projects will be
				available in a later update.
			</p>

			<div className="flex flex-wrap gap-loose border-t border-rule-faint pt-loose">
				<LinkAction href="/basemaps">Open base map upload</LinkAction>
				<LinkAction href="/instrument">Open the Form Studio</LinkAction>
				<LinkAction href="/overview">Open the overview</LinkAction>
			</div>

			<GhostAction onClick={onStartAgain} className="self-start">
				Start again
			</GhostAction>
		</div>
	);
}
