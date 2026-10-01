"use client";

import { Input, SecondaryAction } from "@/components/nocturne/chrome";

import { Field } from "../Field";
import { LineGlyph, PointGlyph, PolygonGlyph, ProjectFileGlyph, ZoneGridGlyph } from "../LayerGlyphs";
import type { SetupState } from "../types";
import { isValidSlug, slugify } from "../utils";

const LAYERS = [
	{
		name: "Ground",
		required: true,
		Glyph: PolygonGlyph,
		body: "The site boundary — the outline every zone and point sits inside."
	},
	{
		name: "Zones",
		required: true,
		Glyph: ZoneGridGlyph,
		body: "Named sub-areas observers record against, and the unit a round covers."
	},
	{
		name: "Paths",
		required: false,
		Glyph: LineGlyph,
		body: "Walking routes and circulation, carried for reference on the map."
	},
	{
		name: "Trees",
		required: false,
		Glyph: PointGlyph,
		body: "Canopy or landmark points, carried for context around the zones."
	},
	{
		name: ".qgz project",
		required: false,
		Glyph: ProjectFileGlyph,
		body: "The QGIS project itself, so layer styling carries over."
	}
] as const;

export function SiteStep({
	state,
	onChange
}: {
	readonly state: SetupState;
	readonly onChange: (patch: Partial<SetupState>) => void;
}) {
	const slugError =
		state.siteCode !== "" && !isValidSlug(state.siteCode)
			? "Use lowercase letters, numbers and hyphens only."
			: undefined;

	return (
		<div className="flex flex-col gap-loose">
			<Field label="Site name" htmlFor="site-name">
				<Input
					className="min-h-11"
					id="site-name"
					placeholder="Riverside Park playground"
					autoComplete="off"
					value={state.siteName}
					onChange={event => {
						const siteName = event.target.value;
						onChange({
							siteName,
							...(state.siteCodeEdited ? {} : { siteCode: slugify(siteName) })
						});
					}}
				/>
			</Field>

			<Field label="Site code" htmlFor="site-code" error={slugError}>
				<Input
					className="min-h-11"
					id="site-code"
					placeholder="riverside-park-playground"
					autoComplete="off"
					value={state.siteCode}
					onChange={event => onChange({ siteCode: event.target.value, siteCodeEdited: true })}
				/>
			</Field>

			<div className="rounded-lg border border-edge bg-surface p-loose">
				<p className="text-meta text-neutral-400">Next, the manager uploads a QGIS export</p>
				<div className="mt-base flex flex-col gap-base">
					{LAYERS.map(layer => (
						<div key={layer.name} className="flex items-start gap-snug">
							<layer.Glyph className="mt-[1px] size-5 shrink-0 text-neutral-400" />
							<div className="min-w-0">
								<p className="text-detail text-neutral-200">
									{layer.name}
									<span
										className={`ml-tight text-micro ${layer.required ? "text-attention-text" : "text-neutral-500"}`}>
										{layer.required ? "required" : "optional"}
									</span>
								</p>
								<p className="text-micro text-neutral-500">{layer.body}</p>
							</div>
						</div>
					))}
				</div>
				<SecondaryAction href="/basemaps" className="mt-loose">
					Open the package upload
				</SecondaryAction>
			</div>
		</div>
	);
}
