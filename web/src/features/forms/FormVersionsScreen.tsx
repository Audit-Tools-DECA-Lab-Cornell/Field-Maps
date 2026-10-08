"use client";

import { Button, ButtonLink } from "@/components/contour/Button";
import { FactsList } from "@/components/contour/FactsList";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";

import { useCreateDraft, useFormWriteBlock } from "./CreateDraftDialog";
import {
	allVersions,
	changedIds,
	definitionOf,
	latestPublishedOf,
	openDraftOf,
	plural,
	type VersionView
} from "./model";
import { Eyebrow, versionQualifier, VersionStateText } from "./parts";
import { NOTES_ID, ProtocolNotesIsland } from "./ProtocolNotes";
import { RetireDialog } from "./RetireDialog";
import { type FormsPreview, useFormsPreview } from "./store";

/** Moves to the protocol notes and puts focus on them, so a screen reader starts reading there. */
export function readNotes() {
	const notes = document.getElementById(NOTES_ID);
	if (!notes) return;
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	notes.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
	notes.focus({ preventScroll: true });
}

/**
 * Form versions (project-12): the version history with one action per version, the immutability
 * contract, and Janet's open protocol notes.
 */
export function FormVersionsScreen({ org, project }: { org: string; project: string }) {
	const preview = useFormsPreview();
	const blocked = useFormWriteBlock();
	const create = useCreateDraft(org, project);
	const versions = allVersions(preview);
	const editor = (id: string) => projectHref(org, project, `forms/versions/${id}`);
	const draft = openDraftOf("demonstration", preview);
	const published = latestPublishedOf("demonstration", preview);

	const primary = draft ? (
		<ButtonLink href={editor(draft.id)} icon="pencil">
			Open draft
		</ButtonLink>
	) : published ? (
		<Button
			icon="pencil"
			disabled={blocked !== null}
			disabledReason={blocked ?? undefined}
			onClick={() => create("copy", published.id)}>
			Start a new draft
		</Button>
	) : null;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[{ label: "Forms", href: projectHref(org, project, "forms") }, { label: "Form versions" }]}
				title="Form versions"
				lead="The demonstration form and Janet’s candidate draft."
				actions={primary}
			/>

			<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<Island title="Version history" flush>
					<PreviewStateView
						loadingLabel="Loading form versions…"
						rows={3}
						headingLevel={3}
						empty={{
							icon: "file-text",
							title: "No form versions yet",
							body: "Create a form draft on Project forms. Its versions appear here."
						}}
						filtered={{
							title: "No versions match this view",
							body: "Change your filters to see more versions. Every version is unchanged."
						}}>
						<HistoryTable
							versions={versions}
							preview={preview}
							selected={draft?.id}
							editor={editor}
							blocked={blocked}
							onStart={id => create("copy", id)}
						/>
					</PreviewStateView>
				</Island>

				<Island>
					<Eyebrow>Immutability contract</Eyebrow>
					<h2 className="mt-2 type-section text-ink">Old answers keep their meaning.</h2>
					<p className="mt-3 type-body text-ink-2">
						Editing a published version starts a new draft. Publishing creates another immutable version; it
						does not reinterpret old observations.
					</p>
					<FactsList
						className="mt-6 border-t border-rule pt-4"
						labelWidth="minmax(8rem, 40%)"
						items={[
							{ label: "Existing observations", value: "Retain the capture-time form version" },
							{ label: "Active sessions", value: "Keep their locked version" },
							{ label: "Retired versions", value: "Readable for historical records" },
							{ label: "GIS fields", value: "Stable IDs and version-specific definitions" }
						]}
					/>
					<div className="mt-6">
						<RetireDialog />
					</div>
				</Island>
			</div>

			<ProtocolNotesIsland />
		</div>
	);
}

function HistoryTable({
	versions,
	preview,
	selected,
	editor,
	blocked,
	onStart
}: {
	versions: VersionView[];
	preview: FormsPreview;
	selected: string | undefined;
	editor: (id: string) => string;
	blocked: string | null;
	onStart: (id: string) => void;
}) {
	const rows = versions.map(version => {
		const raw = definitionOf(version.id, preview);
		const base = version.base ? definitionOf(version.base, preview) : undefined;
		return { version, changes: raw ? changedIds(raw, base).size : 0 };
	});
	return (
		<>
			{/* Below 640 px each version is a card: the id and state on top, then its use and its action. */}
			<ul className="divide-y divide-rule sm:hidden">
				{rows.map(({ version, changes }) => (
					<li
						key={version.id}
						className={
							version.id === selected ? "bg-well px-island-pad py-4 selected-bar" : "px-island-pad py-4"
						}>
						<p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
							<span className="type-mono-data text-ink">{version.id}</span>
							<VersionStateText
								state={version.state}
								qualifier={versionQualifier(version, changes, "row")}
							/>
						</p>
						<p className="mt-1 type-small text-ink-2">
							{version.observations > 0 ? plural(version.observations, "observation") : "Not in use"}
						</p>
						<div className="mt-3">
							<VersionAction
								version={version}
								editor={editor}
								blocked={blocked}
								onStart={() => onStart(version.id)}
							/>
						</div>
					</li>
				))}
			</ul>
			<div className="hidden sm:block">
				<Table caption="Form version history">
					<THead>
						<tr>
							<Th>Version</Th>
							<Th>State</Th>
							<Th>In use</Th>
							<Th>
								<span className="sr-only">Action</span>
							</Th>
						</tr>
					</THead>
					<TBody>
						{versions.map(version => {
							const raw = definitionOf(version.id, preview);
							const base = version.base ? definitionOf(version.base, preview) : undefined;
							const changes = raw ? changedIds(raw, base).size : 0;
							return (
								<Tr key={version.id} selected={version.id === selected}>
									<Td mono className="text-ink">
										{version.id}
									</Td>
									<Td>
										<VersionStateText
											state={version.state}
											qualifier={versionQualifier(version, changes, "row")}
										/>
									</Td>
									<Td>
										{version.observations > 0
											? plural(version.observations, "observation")
											: "Not in use"}
									</Td>
									<Td className="text-right">
										<VersionAction
											version={version}
											editor={editor}
											blocked={blocked}
											onStart={() => onStart(version.id)}
										/>
									</Td>
								</Tr>
							);
						})}
					</TBody>
				</Table>
			</div>
		</>
	);
}

function VersionAction({
	version,
	editor,
	blocked,
	onStart
}: {
	version: VersionView;
	editor: (id: string) => string;
	blocked: string | null;
	onStart: () => void;
}) {
	if (version.state === "published")
		return (
			<Button
				variant="outline"
				icon="pencil"
				disabled={blocked !== null}
				disabledReason={blocked ?? undefined}
				aria-label={`Start a new draft from ${version.id}`}
				onClick={onStart}
				className="whitespace-nowrap sm:w-48">
				Start a new draft
			</Button>
		);
	if (version.state === "retired")
		return (
			<ButtonLink
				href={editor(version.id)}
				variant="outline"
				icon="eye"
				aria-label={`Read ${version.id}`}
				className="whitespace-nowrap sm:w-48">
				Read version
			</ButtonLink>
		);
	if (version.id === "janet-test-v1")
		return (
			<Button variant="outline" icon="book-open" onClick={readNotes} className="whitespace-nowrap sm:w-48">
				Read notes
			</Button>
		);
	return (
		<ButtonLink
			href={editor(version.id)}
			variant="outline"
			icon="pencil"
			aria-label={`Edit draft ${version.id}`}
			className="whitespace-nowrap sm:w-48">
			Edit draft
		</ButtonLink>
	);
}
