"use client";

import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Field } from "@/components/contour/Field";
import { TextInput } from "@/components/contour/TextInput";
import { useToast } from "@/components/contour/Toast";
import { usePreview } from "@/features/shell/PreviewProvider";
import { SITES } from "@/fixtures";

import { sitesStore, slugify } from "./store";

/**
 * "Create site" (project-06): names a place. In this preview the site joins the session's list with no map
 * package yet; its map and zones would arrive with the first QGIS package.
 */
export function CreateSiteDialog({ project, existing }: { project: string; existing: string[] }) {
	const { can, offline } = usePreview();
	const toast = useToast();
	const inputId = useId();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	if (!can("uploadPackage") || offline)
		return (
			<Button
				icon="plus"
				disabled
				disabledReason={
					offline
						? "You are offline. Sites can be created once the connection returns."
						: "Only project managers can create sites."
				}>
				Create site
			</Button>
		);

	function submit(event: FormEvent) {
		event.preventDefault();
		const trimmed = name.trim().replace(/\s+/g, " ");
		const slug = slugify(trimmed);
		if (!trimmed || !slug) {
			setError("Enter a name for the site.");
			return;
		}
		const taken =
			existing.some(other => other.toLowerCase() === trimmed.toLowerCase()) ||
			SITES.some(site => site.slug === slug) ||
			sitesStore.get().created.some(site => site.slug === slug);
		if (taken) {
			setError("A site with this name is already in this project. Choose another name.");
			return;
		}
		sitesStore.set(current => ({
			...current,
			created: [...current.created, { slug, projectSlug: project, name: trimmed }]
		}));
		setOpen(false);
		setName("");
		setError(null);
		toast({
			title: `${trimmed} added for this preview`,
			description: "It has no map package yet.",
			action: {
				label: "Undo",
				onClick: () =>
					sitesStore.set(current => ({
						...current,
						created: current.created.filter(site => site.slug !== slug)
					}))
			}
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				if (!next) setError(null);
			}}
			title="Create site"
			description="Its map and zones arrive with the first QGIS package."
			trigger={<Button icon="plus">Create site</Button>}>
			<form onSubmit={submit} noValidate className="flex flex-col gap-6">
				<Field
					label="Site name"
					htmlFor={inputId}
					hint="The place as observers know it, such as Riverside."
					error={error}>
					<TextInput
						value={name}
						autoComplete="off"
						maxLength={80}
						onChange={event => {
							setName(event.target.value);
							if (error) setError(null);
						}}
					/>
				</Field>
				<div className="flex flex-wrap items-center justify-end gap-3">
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" icon="plus">
						Create site
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
