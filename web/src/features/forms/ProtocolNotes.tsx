"use client";

import { useEffect } from "react";

import { Island } from "@/components/contour/Island";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { PROTOCOL_NOTES } from "@/fixtures";

import { plural } from "./model";
import { FlagGlyph } from "./parts";

/** The heading the "Read notes" button and the publication review's link move focus to. */
export const NOTES_ID = "notes";

/**
 * "Janet draft · protocol notes" (project-12): the decisions the study has not made yet. Each one holds
 * janet-test-v1 as a draft; nothing is filled in on the study's behalf.
 */
export function ProtocolNotesIsland() {
	// Arriving from "Read every protocol note" (…/versions#notes): start reading at the notes.
	useEffect(() => {
		if (window.location.hash === `#${NOTES_ID}`) document.getElementById(NOTES_ID)?.focus({ preventScroll: true });
	}, []);

	return (
		<Island
			id={NOTES_ID}
			tabIndex={-1}
			title="Janet draft · protocol notes"
			meta={
				<span className="inline-flex items-baseline gap-2 font-semibold text-waiting">
					<FlagGlyph className="self-center" />
					{plural(PROTOCOL_NOTES.length, "open decision")}
				</span>
			}
			className="scroll-mt-6">
			<PreviewStateView
				loadingLabel="Loading protocol notes…"
				rows={4}
				headingLevel={3}
				empty={{
					icon: "flag",
					title: "No protocol notes",
					body: "Every decision on this draft has been made. Nothing holds it back from review."
				}}
				filtered={{
					title: "No protocol notes match this view",
					body: "Change your filters to see more notes. The notes themselves are unchanged."
				}}>
				<p className="max-w-[72ch] type-body text-ink-2">
					Each note is a decision the study has not made yet. The draft cannot be published while any of them
					is open; nothing is filled in on the study’s behalf.
				</p>
				<ul className="mt-6 grid gap-x-10 md:grid-cols-2">
					{PROTOCOL_NOTES.map(note => (
						<li key={note.id} className="flex gap-4 border-t border-rule py-5">
							<FlagGlyph className="mt-0.5" />
							<div className="min-w-0">
								<h3 className="type-body font-semibold text-ink">{note.title}</h3>
								<p className="mt-1 type-body text-ink-2">{note.detail}</p>
								<p className="mt-2 type-mono-data text-ink">{note.source}</p>
							</div>
						</li>
					))}
				</ul>
			</PreviewStateView>
		</Island>
	);
}
