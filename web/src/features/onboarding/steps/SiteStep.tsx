"use client";

import type { ComponentType } from "react";

import { Field } from "@/components/contour/Field";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { TextInput } from "@/components/contour/TextInput";
import { EXPECTED_GEOMETRY, REQUIRED_LAYERS, SLOT_LABELS, SLOT_ORDER, type SlotTarget } from "@/lib/packages";

import { LineGlyph, PointGlyph, PolygonGlyph, ProjectFileGlyph, ZoneGridGlyph } from "../LayerGlyphs";
import type { StepBodyProps } from "./types";

type GlyphComponent = ComponentType<{ className?: string }>;

/** What each part of the export holds, in the order the package checks list them. */
const LAYER_DETAIL: Record<SlotTarget, { glyph: GlyphComponent; body: string }> = {
	ground: { glyph: PolygonGlyph, body: "The site boundary that every zone and point sits inside." },
	zones: { glyph: ZoneGridGlyph, body: "The named areas observers record against, such as North meadow." },
	paths: { glyph: LineGlyph, body: "Walking routes, shown on the map for reference." },
	trees: { glyph: PointGlyph, body: "Canopy and landmark points, shown for context." },
	project: { glyph: ProjectFileGlyph, body: "Read for provenance and the imagery licence check." }
};

const GEOMETRY_WORD: Record<string, string> = {
	Polygon: "Polygons",
	LineString: "Lines",
	Point: "Points"
};

const PARTS: readonly SlotTarget[] = [...SLOT_ORDER, "project"];

function Tag({ children }: { children: string }) {
	return (
		<span className="inline-flex items-center rounded-pill border border-edge px-2.5 type-small text-ink-2">
			{children}
		</span>
	);
}

/** Step 3: the first site's name, and what its QGIS package needs once the project exists. */
export function SiteStep({ state, update }: StepBodyProps) {
	return (
		<>
			<Field
				label="Site name"
				htmlFor="site-name"
				hint="Its map and zones arrive later as a versioned QGIS package.">
				<TextInput
					id="site-name"
					name="site"
					placeholder="e.g. Riverside"
					autoComplete="off"
					value={state.siteName}
					onChange={event => update({ siteName: event.target.value })}
				/>
			</Field>

			<InnerPanel>
				<h2 id="package-needs" className="type-mono-label text-ink-2">
					What the QGIS package needs
				</h2>
				<ul aria-labelledby="package-needs" className="mt-2">
					{PARTS.map(part => {
						const { glyph: Glyph, body } = LAYER_DETAIL[part];
						const required = part !== "project" && REQUIRED_LAYERS.includes(part);
						const geometry = part === "project" ? ".qgz file" : GEOMETRY_WORD[EXPECTED_GEOMETRY[part]];
						return (
							<li
								key={part}
								className="flex items-start gap-3 border-b border-rule py-3 last:border-b-0 last:pb-0">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-well text-ink">
									<Glyph className="size-5" />
								</span>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
										<p className="type-body font-semibold text-ink">
											{SLOT_LABELS[part]}
											<span className="font-normal text-ink-2"> · {geometry}</span>
										</p>
										<Tag>{required ? "Required" : "Optional"}</Tag>
									</div>
									<p className="type-small text-ink-2">{body}</p>
								</div>
							</li>
						);
					})}
				</ul>
				<p className="mt-4 border-t border-rule pt-3 type-small text-ink-2">
					Upload it from Sites › Map packages once the project exists. Each upload becomes a new version, and
					observers only see a version after you activate it.
				</p>
			</InnerPanel>
		</>
	);
}
