"use client";

import { useId, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Field } from "@/components/contour/Field";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextInput } from "@/components/contour/TextInput";
import { useToast } from "@/components/contour/Toast";
import { packageRows } from "@/features/packages/model";
import { packagesStore } from "@/features/packages/store";
import { useReaderGrants } from "@/features/qgis/store";
import { usePreview } from "@/features/shell/PreviewProvider";
import { useSessionStore } from "@/features/shell/useSessionStore";
import { observationsFor, PROJECT_FORMS, sitesIn } from "@/fixtures";

import { useProjectSettings } from "./store";

function count(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

/**
 * Archive project and Delete project (project-19). Archiving is a preview switch that stops new collection
 * on screen; deletion lists every affected resource and needs the project code typed, and in this preview
 * nothing is deleted.
 */
export function DangerZone({ org, project }: { org: string; project: string }) {
	const { toast } = useToast();
	const { offline, screenState } = usePreview();
	const { settings, update } = useProjectSettings(org, project);
	const blocked = offline || screenState === "loading" || screenState === "error";
	const reason = offline ? "You are offline. Changes cannot be saved until you reconnect." : undefined;

	function archive(archived: boolean) {
		update({ archived });
		toast({
			title: archived ? `${settings.name} archived in this preview` : `${settings.name} restored in this preview`,
			description: archived
				? "New collection is stopped. Records on devices can still upload."
				: "Collection can start again.",
			action: { label: "Undo", altText: "Undo", onClick: () => update({ archived: !archived }) }
		});
	}

	return (
		<>
			<Island
				title="Archive project"
				meta={settings.archived ? <StateBadge kind="project" state="archived" size="sm" /> : undefined}>
				{settings.archived ? (
					<div className="flex flex-col items-start gap-4">
						<p className="type-body text-ink">
							New collection is stopped. Historical records and versions stay readable, and observers can
							still upload what is on their devices.
						</p>
						<Button
							variant="outline"
							icon="undo-2"
							disabled={blocked}
							disabledReason={reason}
							onClick={() => archive(false)}>
							Restore project
						</Button>
					</div>
				) : (
					<div className="flex flex-col items-start gap-4">
						<p className="type-body text-ink">
							Archiving stops new collection but preserves access to historical records and versions.
						</p>
						{blocked ? (
							<Button variant="outline" icon="archive" disabled disabledReason={reason}>
								Archive project
							</Button>
						) : (
							<ArchiveDialog name={settings.name} onArchive={() => archive(true)} />
						)}
					</div>
				)}
			</Island>

			<Island title="Delete project" tone="danger">
				<div className="flex flex-col items-start gap-4">
					<p className="type-body text-ink">
						Deletion must respect research-retention rules. You see every affected resource before anything
						is removed.
					</p>
					{blocked ? (
						<Button variant="danger" icon="trash-2" disabled disabledReason={reason}>
							Review deletion
						</Button>
					) : (
						<DeleteDialog project={project} name={settings.name} code={settings.code} />
					)}
				</div>
			</Island>
		</>
	);
}

function ArchiveDialog({ name, onArchive }: { name: string; onArchive: () => void }) {
	return (
		<Dialog
			title={`Archive ${name}?`}
			description="Archiving stops new collection. Observers keep their unsent records and can still upload them."
			trigger={
				<Button variant="outline" icon="archive">
					Archive project
				</Button>
			}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button icon="archive" onClick={onArchive}>
							Archive project
						</Button>
					</DialogClose>
				</>
			}>
			<ul className="flex list-disc flex-col gap-1 pl-5 type-body text-ink">
				<li>No new collection session can start on this project.</li>
				<li>Sites, map packages, form versions and observations stay readable and exportable.</li>
				<li>You can restore the project later.</li>
			</ul>
		</Dialog>
	);
}

function DeleteDialog({ project, name, code }: { project: string; name: string; code: string }) {
	const id = useId();
	const { toast } = useToast();
	const packages = useSessionStore(packagesStore);
	const { grants } = useReaderGrants(project);
	const [open, setOpen] = useState(false);
	const [typed, setTyped] = useState("");
	const sites = sitesIn(project);
	const versions = sites.reduce(
		(sum, site) =>
			sum + packageRows(site.slug, packages[site.slug] ?? {}).filter(row => row.state !== "bundled").length,
		0
	);
	const formVersions = PROJECT_FORMS.filter(form => form.projectSlug === project).reduce(
		(sum, form) => sum + form.versionIds.length,
		0
	);
	const observations = observationsFor(project).length;
	const matches = typed.trim() === code;

	const affected = [
		count(sites.length, "site", "sites"),
		count(versions, "map package version", "map package versions"),
		count(formVersions, "form version", "form versions"),
		count(observations, "observation", "observations"),
		count(grants.length, "reader grant", "reader grants")
	];

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				if (!next) setTyped("");
			}}
			title="Review deletion"
			description={`Deleting ${name} would remove everything below, for everyone in the project.`}
			trigger={
				<Button variant="danger" icon="trash-2">
					Review deletion
				</Button>
			}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Keep project</Button>
					</DialogClose>
					<Button
						variant="danger-solid"
						icon="triangle-alert"
						disabled={!matches}
						disabledReason={matches ? undefined : `Type ${code} to turn this on.`}
						onClick={() => {
							setOpen(false);
							setTyped("");
							toast({
								title: `${name} was not deleted`,
								description: "In this preview nothing is deleted."
							});
						}}>
						Delete {name}
					</Button>
				</>
			}>
			<div className="flex flex-col gap-5">
				<ul aria-label="Affected resources" className="divide-y divide-rule border-y border-rule">
					{affected.map(line => (
						<li key={line} className="py-2.5 type-body text-ink">
							{line}
						</li>
					))}
				</ul>
				<Field label={`Type the project code ${code} to confirm`} htmlFor={`${id}-confirm`}>
					<TextInput
						autoComplete="off"
						spellCheck={false}
						className="font-mono"
						value={typed}
						onChange={event => setTyped(event.target.value.toUpperCase())}
					/>
				</Field>
				<Note tone="waiting">
					Deletion must respect research-retention rules. In this preview nothing is deleted.
				</Note>
			</div>
		</Dialog>
	);
}
