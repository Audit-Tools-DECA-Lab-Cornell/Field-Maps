"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Field } from "@/components/contour/Field";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextInput } from "@/components/contour/TextInput";
import { useToast } from "@/components/contour/Toast";
import { formatDay, PREVIEW_NOW, VIEWER } from "@/fixtures";

import type { DataFilters } from "./filters";
import { savedViewsStore, viewIdFor } from "./savedViews";

export type SaveViewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filters: DataFilters;
	/** The name the field starts with, from the filters: "Woodland edge · Round 3". */
	suggestedName: string;
	/** "14 observations · all zones · all rounds · all types". */
	scope: string;
	viewsHref: string;
};

/**
 * Save view (project-02, proposal U7): names the current filter set and adds it to the session's saved
 * views. A saved view keeps the filters, never a copy of the records.
 */
export function SaveViewDialog({ open, onOpenChange, filters, suggestedName, scope, viewsHref }: SaveViewDialogProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [name, setName] = useState(suggestedName);
	const [error, setError] = useState<string | null>(null);

	// A fresh dialog starts from the filters on screen now, not from what was typed last time.
	const [openedWith, setOpenedWith] = useState<string | null>(null);
	if (open && openedWith !== suggestedName) {
		setOpenedWith(suggestedName);
		setName(suggestedName);
		setError(null);
	}
	if (!open && openedWith !== null) setOpenedWith(null);

	function save(event: FormEvent) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Enter a name for the view.");
			return;
		}
		const views = savedViewsStore.get();
		savedViewsStore.set([
			...views,
			{
				id: viewIdFor(trimmed, views),
				name: trimmed,
				zone: filters.zone,
				round: filters.round,
				playType: filters.type,
				query: filters.q.trim(),
				savedBy: VIEWER.initials,
				savedLabel: formatDay(PREVIEW_NOW)
			}
		]);
		onOpenChange(false);
		toast({
			title: `Saved view “${trimmed}”`,
			description: "Kept for this preview session.",
			action: { label: "Open", onClick: () => router.push(viewsHref), altText: "Open Reports, Saved views" }
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			title="Save view"
			description="Saved views keep the filters, not a copy of the records.">
			<form onSubmit={save} noValidate className="flex flex-col gap-5">
				<Field label="View name" htmlFor="save-view-name" error={error}>
					<TextInput
						value={name}
						onChange={event => {
							setName(event.target.value);
							if (error) setError(null);
						}}
						autoComplete="off"
					/>
				</Field>
				<div className="flex flex-col gap-1">
					<p className="type-mono-label text-ink-2">Filters in this view</p>
					<p className="type-body text-ink">{scope}</p>
				</div>
				<p className="type-small text-ink-2">
					<StateBadge kind="proposal" state="open" label="Proposal U7" size="sm" className="mr-2" />
					Saved views are a proposal. This one lasts for this preview session.
				</p>
				<div className="flex flex-wrap items-center justify-end gap-3">
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" icon="plus">
						Save view
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
