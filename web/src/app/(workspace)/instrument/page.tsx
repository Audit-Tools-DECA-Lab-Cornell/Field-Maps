import { PageHeader, StatTile } from "@/components/app-shell/PageHeader";
import { VariableLibrary } from "@/components/instrument/VariableLibrary";
import { AttentionNote, Chip, FadeRule, Prose, SecondaryAction, SectionLabel } from "@/components/nocturne/chrome";
import { BLOCKING_FLAGS, DISPLAY_RULES, DRAFT_VERSION, FORM_VERSIONS, VARIABLES } from "@/data/instrument";
import { OBSERVATIONS, PREVIEWED_VERSION } from "@/data/observations";
import { PROJECT } from "@/data/project";
import { formatCount, formatDate, plural } from "@/lib/format";

export const metadata = { title: "Instrument" };

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
				title="The instrument, and what is holding up its first version"
				lead="A published version is immutable: records keep the version they were collected under, and their answers keep the meaning they had. Publishing creates a version beside the old one — it never edits one."
				actions={
					<SecondaryAction
						disabled
						title={`${plural(BLOCKING_FLAGS.length, "variable")} still carry an open question`}>
						Review and publish
					</SecondaryAction>
				}
			/>

			<div className="px-gutter pb-page">
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

				<section>
					<SectionLabel>Versions</SectionLabel>
					<h2 className="mt-tight mb-base text-heading text-text">
						{plural(FORM_VERSIONS.length, "version")} on this project
					</h2>
					<div className="grid grid-cols-1 gap-loose md:grid-cols-2">
						{FORM_VERSIONS.map(version => (
							<article key={version.id} className="min-w-0">
								<div className="flex flex-wrap items-baseline gap-snug">
									<h3 className="text-body font-medium text-text" translate="no">
										{version.code}
									</h3>
									<Chip
										tone={version.state === "published" ? "accent" : "attention"}
										glyph={version.state === "published" ? "✓" : "◷"}>
										{version.state === "published" ? "Published" : "Draft"}
									</Chip>
									<span className="text-micro text-neutral-600">
										{version.publishedAt === null
											? "Never published"
											: `Published ${formatDate(version.publishedAt)}`}
									</span>
								</div>
								<p className="mt-hair text-detail text-neutral-400">{version.label}</p>
								<p className="mt-snug text-micro text-neutral-500">{version.note}</p>
								<p className="mt-snug text-micro text-neutral-600">
									<span className="tnum">{formatCount(version.variableCount)}</span> variables ·{" "}
									<span className="tnum">{formatCount(version.recordCount)}</span> records in the
									database
									{version.code === PREVIEWED_VERSION && (
										<>
											{" · "}
											<span className="tnum">{formatCount(OBSERVATIONS.length)}</span> in the
											preview this workspace shows
										</>
									)}
								</p>
							</article>
						))}
					</div>
				</section>

				<FadeRule className="my-wide" />

				<VariableLibrary />

				<FadeRule className="my-wide" />

				<section className="max-w-[80ch]">
					<SectionLabel>Display logic</SectionLabel>
					<h2 className="mt-tight mb-base text-heading text-text">Rules, in plain language</h2>
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
						title="Editing and publishing are not built here yet"
						body="This screen reads the instrument; it does not change it. Publishing needs three things that do not exist yet: the API accepting a second form version, an immutable server-side version record, and a typed GIS view for its columns. Until then the draft renders and saves on the device, and its records stay there."
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
