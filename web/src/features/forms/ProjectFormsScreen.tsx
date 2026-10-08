"use client";

import Link from "next/link";

import { Icon, isIconName } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { stateOf } from "@/lib/contour";

import { CreateDraftDialog } from "./CreateDraftDialog";
import { allForms, changedIds, definitionOf, type FormView, plural, type VersionState } from "./model";
import { Eyebrow, FlagGlyph, VersionChip, versionQualifier } from "./parts";
import { type FormsPreview, useFormsPreview } from "./store";

/**
 * Project forms (project-11): every form in the project with its versions as chips. A draft can change;
 * a published version never does. Each row opens the version history.
 */
export function ProjectFormsScreen({ org, project }: { org: string; project: string }) {
	const preview = useFormsPreview();
	const forms = allForms(project, preview);
	const versionsHref = projectHref(org, project, "forms/versions");
	const janet = forms.find(form => form.slug === "janet-test");

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Project forms"
				lead="A draft can change. Published versions keep their original meaning."
				actions={<CreateDraftDialog org={org} project={project} />}
			/>
			<Island flush divided={false} aria-label="Forms in this project">
				<PreviewStateView
					loadingLabel="Loading forms…"
					rows={2}
					headingLevel={2}
					empty={{
						icon: "file-text",
						title: "No forms yet",
						body: "A form holds the questions observers answer. Create a draft to start one."
					}}
					filtered={{
						title: "No forms match this view",
						body: "Change your filters to see more forms. Your forms and their versions are unchanged."
					}}>
					<ul className="divide-y divide-rule">
						{forms.map(form => (
							<li key={form.slug}>
								<FormRow form={form} preview={preview} href={versionsHref} />
							</li>
						))}
					</ul>
				</PreviewStateView>
			</Island>
			<Legend />
			{janet && janet.versions.some(version => version.state === "draft" && version.protocolNotesOpen > 0) && (
				<Note tone="waiting" icon="flag">
					Janet’s form stays a draft until its protocol notes are resolved. Nothing on this page publishes or
					alters it.
				</Note>
			)}
		</div>
	);
}

const ROW =
	"group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-5 px-island-pad py-6 " +
	"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-ground " +
	"[--ct-size-focus-gap:calc(var(--ct-size-focus-ring)*-2)] " +
	"lg:grid-cols-[minmax(0,2.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]";

/** The fact columns sit under the title until the row is wide enough for all of them. */
const FACTS = "col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-subgrid lg:pt-3";

function inUseOf(form: FormView): string {
	const observations = form.versions.reduce((sum, version) => sum + version.observations, 0);
	if (observations > 0) return plural(observations, "observation");
	return form.assignedTo === null || form.created ? "Not assigned" : "Not in use";
}

function FormRow({ form, preview, href }: { form: FormView; preview: FormsPreview; href: string }) {
	const notesOpen = Math.max(0, ...form.versions.map(version => version.protocolNotesOpen));
	const showNotes = form.assignedTo === null || notesOpen > 0;

	return (
		<Link href={href} className={ROW}>
			<div className="min-w-0">
				<h2 className="type-island text-ink sm:type-section">{form.title}</h2>
				<p className="mt-2 type-body text-ink-2">{form.summary}</p>
				{form.source && <p className="mt-1 type-mono-data text-ink">{form.source}</p>}
				{form.versions.length > 0 && (
					<ul className="mt-4 flex flex-wrap gap-2" aria-label={`${form.title} versions`}>
						{form.versions.map(version => {
							const raw = definitionOf(version.id, preview);
							const base = version.base ? definitionOf(version.base, preview) : undefined;
							const changes = raw ? changedIds(raw, base).size : 0;
							return (
								<li key={version.id}>
									<VersionChip
										id={version.id}
										state={version.state}
										qualifier={versionQualifier(version, changes, "chip")}
									/>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			<Icon
				name="chevron-right"
				size={22}
				className="col-start-2 row-start-1 mt-1 shrink-0 text-ink lg:col-start-5 lg:mt-12"
			/>

			<div className={FACTS}>
				<div>
					<Eyebrow>Questions</Eyebrow>
					<p className="mt-2 type-body text-ink">
						{form.questions.total === 0
							? "None yet"
							: `${form.questions.total}, of which ${form.questions.conditional} conditional`}
					</p>
				</div>
				{showNotes ? (
					<div>
						<Eyebrow>Protocol notes</Eyebrow>
						<p className="mt-2 inline-flex items-baseline gap-2 type-body font-semibold text-waiting">
							<FlagGlyph className="self-center" />
							{notesOpen > 0 ? `${notesOpen} open` : "None open"}
						</p>
					</div>
				) : (
					<div>
						<Eyebrow>Assigned to</Eyebrow>
						<p className="mt-2 type-body text-ink">{form.assignedTo}</p>
					</div>
				)}
				<div>
					<Eyebrow>In use</Eyebrow>
					<p className="mt-2 type-body text-ink">{inUseOf(form)}</p>
				</div>
			</div>
		</Link>
	);
}

const LEGEND: { state: VersionState; body: string }[] = [
	{ state: "draft", body: "Wording, guidance and required flags can change. Nobody collects with it." },
	{ state: "published", body: "Frozen. Sessions lock to it and every answer keeps its wording." },
	{ state: "retired", body: "No new sessions. Still readable for the records that used it." }
];

/** What each version state means (project-11), under the list. */
function Legend() {
	return (
		<ul className="grid gap-x-8 gap-y-5 md:grid-cols-3" aria-label="Form version states">
			{LEGEND.map(item => {
				const definition = stateOf("form", item.state);
				return (
					<li key={item.state} className="flex items-start gap-4">
						{isIconName(definition.icon) && (
							<Icon name={definition.icon} size={18} className="mt-1 shrink-0 text-ink" />
						)}
						<div className="min-w-0">
							<p className="type-body font-semibold text-ink">{definition.label}</p>
							<p className="type-body text-ink-2">{item.body}</p>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
