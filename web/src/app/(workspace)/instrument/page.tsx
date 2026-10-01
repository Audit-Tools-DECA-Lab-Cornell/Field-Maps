import { PageHeader, StatTile } from "@/components/app-shell/PageHeader";
import { VariableLibrary } from "@/components/instrument/VariableLibrary";
import { AttentionNote, FadeRule, Prose, SecondaryAction, SectionLabel } from "@/components/nocturne/chrome";
import { FormStudio } from "@/components/studio/FormStudio";
import type { RawDefinition, SourceDefinition } from "@/components/studio/model";
import { BLOCKING_FLAGS, DISPLAY_RULES, DRAFT_VERSION, VARIABLES } from "@/data/instrument";
import { PROJECT } from "@/data/project";
import { formatCount, plural } from "@/lib/format";

import janetTestV1 from "../../../../../contracts/forms/janet-test-v1.json";
import shellV1 from "../../../../../contracts/forms/shell-v1.json";

export const metadata = { title: "Instrument" };

/**
 * The canonical definitions the collector bundles, read from the repository at build time. The
 * studio validates them again in the browser, so a malformed file is reported, never rendered.
 */
const SOURCES: readonly SourceDefinition[] = [
	{ file: "contracts/forms/janet-test-v1.json", raw: janetTestV1 as unknown as RawDefinition },
	{ file: "contracts/forms/shell-v1.json", raw: shellV1 as unknown as RawDefinition }
];

/**
 * The instrument: what the collector asks, in which order, and under which version.
 *
 * Publishing is the one irreversible act in this product — the database refuses to update or
 * delete a published form version — so this screen is built to make the state before publishing
 * legible, not to make publishing easy.
 */
export default function InstrumentPage() {
	const broken = DISPLAY_RULES.filter(rule => rule.problem !== undefined);
	const included = VARIABLES.filter(variable => variable.included);

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<PageHeader
				kicker={PROJECT.name}
				title="The questions observers answer, and how they read on the device"
				lead="Every question in the order the collector asks it, beside a phone running the same rules. A published version is immutable: records keep the version they were collected under, and changing one starts a new draft beside it."
				actions={
					<SecondaryAction
						disabled
						title={`Publishing needs the instrument API (BE-11); ${plural(BLOCKING_FLAGS.length, "variable")} still carry an open question`}>
						Review and publish
					</SecondaryAction>
				}
			/>

			<div className="px-gutter pb-page">
				<FormStudio sources={SOURCES} initialVersion="janet-test-v1" />

				<FadeRule className="my-wide" />

				<SectionLabel>Workbook preview · local fixtures</SectionLabel>
				<h2 className="mt-tight mb-base text-heading text-text">The full variable library behind the form</h2>
				<div className="grid grid-cols-2 gap-loose sm:grid-cols-4">
					<StatTile
						label="In the library"
						value={formatCount(VARIABLES.length)}
						detail="Rows across both workbooks"
					/>
					<StatTile label="In the draft" value={formatCount(included.length)} detail={DRAFT_VERSION.code} />
					<StatTile
						label="Blocking a publish"
						value={formatCount(BLOCKING_FLAGS.length)}
						detail="Included rows with an open question"
						tone={BLOCKING_FLAGS.length > 0 ? "attention" : "text"}
					/>
					<StatTile
						label="Rules that cannot run"
						value={formatCount(broken.length)}
						detail={`of ${formatCount(DISPLAY_RULES.length)} display rules`}
						tone={broken.length > 0 ? "attention" : "text"}
					/>
				</div>

				<FadeRule className="my-wide" />

				<VariableLibrary />

				<FadeRule className="my-wide" />

				<section className="max-w-[80ch]">
					<SectionLabel>Display logic</SectionLabel>
					<h2 className="mt-tight mb-base text-heading text-text">
						Rules across the whole workbook, in plain language
					</h2>
					<ul className="m-0 list-none p-0">
						{DISPLAY_RULES.map(rule => (
							<li key={`${rule.parent}-${rule.value}`} className="border-b border-rule-faint py-base">
								<p className="text-detail text-neutral-200">
									<span className="text-neutral-500">When </span>
									<span translate="no" className="text-text">
										{rule.parent}
									</span>
									<span className="text-neutral-500"> is </span>
									<span className="text-text">{rule.value}</span>
									<span className="text-neutral-500">, show </span>
									<span className="text-text">{rule.children}</span>
								</p>
								{rule.problem !== undefined && (
									<p className="mt-tight border-l-2 border-attention pl-snug text-micro text-attention-text">
										◼ {rule.problem}
									</p>
								)}
							</li>
						))}
					</ul>
					<Prose tone="faint" className="mt-base">
						Rules are authored as when/is/show sentences and stored as data, never as code. A manager
						configuring a study does not write a GIS expression, and nothing from a workbook is ever
						executed.
					</Prose>
				</section>

				<FadeRule className="my-wide" />

				<div className="max-w-[70ch]">
					<AttentionNote
						title="Publishing is not built here yet"
						body="Drafts can be customized and previewed above, but they stay in this browser. Publishing needs three things that do not exist yet: the API accepting a second form version, an immutable server-side version record, and a typed GIS view for its columns. Until then a draft renders and saves on the device, and its records stay there."
					/>
					<Prose tone="faint" className="mt-base">
						The open questions above are the reason, not the schedule. Every one of them changes what a
						column means, and a column that changes meaning after collection cannot be un-collected.
					</Prose>
				</div>
			</div>
		</div>
	);
}
