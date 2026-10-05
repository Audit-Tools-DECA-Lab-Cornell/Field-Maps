"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { ProposalNote } from "@/components/contour/ProposalNote";
import { RadioRows } from "@/components/contour/RadioRows";
import { useToast } from "@/components/contour/Toast";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";

import {
	copyDefinition,
	definitionOf,
	emptyDefinition,
	findVersion,
	latestPublishedOf,
	nextVersionId,
	plural,
	STARTER_TEMPLATE,
	templateDefinition
} from "./model";
import { addCreatedVersion, type DraftOrigin, formsStore, useFormsPreview } from "./store";

/** Why a reader cannot change forms right now, or null when they can. */
export function useFormWriteBlock(): string | null {
	const { can, offline } = usePreview();
	if (offline) return "You are offline. Form drafts can change once the connection returns.";
	if (!can("editProject")) return "Only project managers can change forms. You can read every version.";
	return null;
}

/**
 * Creates a draft in this preview and opens it in the editor: a copy of the demonstration form's latest
 * published version, a copy of an organization template (proposal U4), or an empty form.
 */
export function useCreateDraft(org: string, project: string) {
	const router = useRouter();
	const toast = useToast();

	/** `from` names the published version to copy; by default, the demonstration form's latest. */
	return function create(origin: DraftOrigin, from?: string) {
		const preview = formsStore.get();
		const editor = (id: string) => projectHref(org, project, `forms/versions/${id}`);
		if (origin === "copy") {
			const base = from ? findVersion(from, preview) : latestPublishedOf("demonstration", preview);
			const raw = base ? definitionOf(base.id, preview) : undefined;
			if (!base || !raw) return;
			const id = nextVersionId(base.id, preview);
			addCreatedVersion(
				{
					id,
					formSlug: base.formSlug,
					formTitle: base.formTitle,
					formSummary: "",
					origin,
					from: base.id
				},
				copyDefinition(raw, id)
			);
			toast({
				title: `${id} is a new draft`,
				description: `Copied from ${base.id}, which stays as it is. The draft lasts until this tab closes.`
			});
			router.push(editor(id));
			return;
		}
		if (origin === "template") {
			const id = nextVersionId("starter-v0", preview);
			addCreatedVersion(
				{
					id,
					formSlug: STARTER_TEMPLATE.id,
					formTitle: STARTER_TEMPLATE.title,
					formSummary: `${STARTER_TEMPLATE.summary}.`,
					origin,
					from: STARTER_TEMPLATE.id
				},
				templateDefinition(id, STARTER_TEMPLATE.title)
			);
			toast({
				title: `${id} is a new draft`,
				description: `Copied from the ${STARTER_TEMPLATE.title} template. Its protocol notes came with it.`
			});
			router.push(editor(id));
			return;
		}
		const id = nextVersionId("form-v0", preview);
		addCreatedVersion(
			{
				id,
				formSlug: `untitled-${id}`,
				formTitle: "Untitled form",
				formSummary: "Started empty in this preview. Add questions in the editor.",
				origin,
				from: null
			},
			emptyDefinition(id, "Untitled form")
		);
		toast({
			title: `${id} is a new, empty draft`,
			description: "Add its questions in the editor. The draft lasts until this tab closes."
		});
		router.push(editor(id));
	};
}

/** "+ Create form draft" (project-11) and its dialog. */
export function CreateDraftDialog({ org, project }: { org: string; project: string }) {
	const preview = useFormsPreview();
	const blocked = useFormWriteBlock();
	const create = useCreateDraft(org, project);
	const [open, setOpen] = useState(false);
	const [origin, setOrigin] = useState<DraftOrigin>("copy");

	const base = latestPublishedOf("demonstration", preview);
	const baseRaw = base ? definitionOf(base.id, preview) : undefined;
	const nextId = base ? nextVersionId(base.id, preview) : null;

	if (blocked)
		return (
			<Button icon="plus" disabled disabledReason={blocked}>
				Create form draft
			</Button>
		);

	function submit(event: FormEvent) {
		event.preventDefault();
		setOpen(false);
		create(origin);
	}

	const options = [
		...(base && baseRaw && nextId
			? [
					{
						value: "copy",
						label: `Start from ${base.id}`,
						description: `Copies the published demonstration form, ${plural(baseRaw.questions.length, "question")}, as ${nextId}. ${base.id} stays as it is.`
					}
				]
			: []),
		{
			value: "template",
			label: `Start from the ${STARTER_TEMPLATE.title} template`,
			description: `Proposal U4 · ${STARTER_TEMPLATE.summary}.`
		},
		{
			value: "empty",
			label: "Start empty",
			description: "A new form with no questions. You add them in the editor."
		}
	];
	const chosen = options.some(option => option.value === origin) ? origin : (options[0].value as DraftOrigin);

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
			title="Create form draft"
			description="A draft can change until it is published. Nothing published changes."
			trigger={<Button icon="plus">Create form draft</Button>}>
			<form onSubmit={submit} className="flex flex-col gap-6">
				<RadioRows
					label="Start the draft from"
					value={chosen}
					onValueChange={value => setOrigin(value as DraftOrigin)}
					options={options}
				/>
				{chosen === "template" && (
					<ProposalNote code="U4">
						Organization form templates are not decided. Using one copies it into this project as an
						independent draft.
					</ProposalNote>
				)}
				<p className="type-small text-ink-2">
					The draft exists only in this preview and is gone when the tab closes.
				</p>
				<div className="flex flex-wrap items-center justify-end gap-3">
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" icon="pencil">
						Create draft
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
