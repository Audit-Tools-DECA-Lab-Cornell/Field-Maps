"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Field } from "@/components/contour/Field";
import { Icon, type IconName } from "@/components/contour/Icon";
import { IconButton } from "@/components/contour/IconButton";
import { Island } from "@/components/contour/Island";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/contour/Menu";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { TextInput } from "@/components/contour/TextInput";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";
import { useReviews } from "@/features/data/review";
import { savedViewsStore, viewIdFor } from "@/features/data/savedViews";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { useSessionStore } from "@/features/shell/useSessionStore";
import { StackedRows } from "@/features/team/StackedRows";
import { formatDay, observationsFor, PREVIEW_NOW, type SavedView, VIEWER } from "@/fixtures";

import { matchesNow, viewHref, viewParts } from "./views";

export type SavedViewsScreenProps = { org: string; project: string };

type Pending = { kind: "rename" | "delete"; view: SavedView } | null;

const EXPLAINERS: { icon: IconName; title: string; body: string }[] = [
	{ icon: "funnel", title: "A view stores", body: "The zone, round and play type filters, and any search text." },
	{
		icon: "table",
		title: "It does not store",
		body: "Observations. The count changes as records arrive or are reviewed."
	},
	{ icon: "download", title: "When you export", body: "The scope is listed again before the download starts." }
];

/**
 * Saved filter views (project-17, proposal U7): every view saved on Data, what it filters, how many records
 * match it now, and Rename, Duplicate and Delete. A view keeps filters, never a copy of the records. Changes
 * apply to this preview only.
 */
export function SavedViewsScreen({ org, project }: SavedViewsScreenProps) {
	const { toast } = useToast();
	const { offline } = usePreview();
	const views = useSessionStore(savedViewsStore);
	const reviews = useReviews();
	const records = observationsFor(project);
	const base = projectHref(org, project);
	const dataHref = `${base}/data`;
	const [pending, setPending] = useState<Pending>(null);

	function duplicate(view: SavedView) {
		const all = savedViewsStore.get();
		const name = `${view.name} (copy)`;
		const copy: SavedView = {
			...view,
			id: viewIdFor(name, all),
			name,
			savedBy: VIEWER.initials,
			savedLabel: formatDay(PREVIEW_NOW)
		};
		const index = all.findIndex(entry => entry.id === view.id);
		savedViewsStore.set([...all.slice(0, index + 1), copy, ...all.slice(index + 1)]);
		toast({
			title: `“${name}” saved`,
			description: "In this preview only.",
			action: {
				label: "Undo",
				altText: "Undo the duplicate",
				onClick: () => savedViewsStore.set(current => current.filter(entry => entry.id !== copy.id))
			}
		});
	}

	function remove(view: SavedView) {
		const before = savedViewsStore.get();
		savedViewsStore.set(before.filter(entry => entry.id !== view.id));
		setPending(null);
		toast({
			title: `“${view.name}” deleted`,
			description: "The observations are unchanged.",
			action: { label: "Undo", altText: "Undo the delete", onClick: () => savedViewsStore.set(before) }
		});
	}

	function rename(view: SavedView, name: string) {
		const previous = view.name;
		savedViewsStore.set(current => current.map(entry => (entry.id === view.id ? { ...entry, name } : entry)));
		setPending(null);
		toast({
			title: `Renamed to “${name}”`,
			description: "In this preview only.",
			action: {
				label: "Undo",
				altText: "Undo the rename",
				onClick: () =>
					savedViewsStore.set(current =>
						current.map(entry => (entry.id === view.id ? { ...entry, name: previous } : entry))
					)
			}
		});
	}

	const actions = (view: SavedView) => (
		<span className="flex items-center justify-end gap-3">
			<TextLink href={viewHref(dataHref, view)} aria-label={`Open ${view.name} on Data`}>
				Open
			</TextLink>
			<Menu modal={false}>
				<MenuTrigger asChild>
					<IconButton icon="ellipsis" label={`More actions for ${view.name}`} size="sm" />
				</MenuTrigger>
				<MenuContent align="end">
					<MenuItem icon="pencil" disabled={offline} onSelect={() => setPending({ kind: "rename", view })}>
						Rename
					</MenuItem>
					<MenuItem icon="copy" disabled={offline} onSelect={() => duplicate(view)}>
						Duplicate
					</MenuItem>
					<MenuSeparator />
					<MenuItem
						icon="trash-2"
						tone="danger"
						disabled={offline}
						onSelect={() => setPending({ kind: "delete", view })}>
						Delete
					</MenuItem>
				</MenuContent>
			</Menu>
		</span>
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[{ label: "Reports", href: `${base}/reports` }, { label: "Saved views" }]}
				title="Saved filter views"
				lead="A saved view preserves filters, not a frozen copy of observations."
				actions={
					<ButtonLink href={dataHref} iconRight="arrow-right">
						Open data
					</ButtonLink>
				}
			/>
			<Island flush className="relative" aria-label="Saved filter views">
				<PreviewStateView
					loadingLabel="Loading saved views…"
					rows={2}
					headingLevel={2}
					empty={{
						icon: "funnel",
						title: "No saved views yet",
						body: "Save a filter set on Data to open it again later. A view keeps filters, not records."
					}}
					filtered={{
						title: "No saved views match this view",
						body: "Change your filters to see more views. Your saved views are unchanged."
					}}>
					{views.length === 0 ? (
						<div className="flex flex-col items-start gap-3 px-island-pad py-6">
							<p className="type-island text-ink">No saved views yet</p>
							<p className="type-body text-ink-2">
								Save a filter set on Data to open it again later. A view keeps filters, not records.
							</p>
						</div>
					) : (
						<>
							<div className="hidden sm:block">
								<Table caption="Saved filter views">
									<THead>
										<tr>
											<Th>View</Th>
											<Th>Zone</Th>
											<Th>Round</Th>
											<Th>Play type</Th>
											<Th>Matches now</Th>
											<Th>Saved by</Th>
											<Th>
												<span className="sr-only">Actions</span>
											</Th>
										</tr>
									</THead>
									<TBody>
										{views.map(view => {
											const parts = viewParts(view, records);
											return (
												<Tr key={view.id}>
													<Td className="font-semibold">{view.name}</Td>
													<Td>{parts.zone}</Td>
													<Td nowrap>{parts.round}</Td>
													<Td>{parts.type}</Td>
													<Td mono className="tnum">
														{matchesNow(view, records, reviews.reviewOf)}
													</Td>
													<Td nowrap>
														{view.savedBy} · {view.savedLabel}
													</Td>
													<Td nowrap>{actions(view)}</Td>
												</Tr>
											);
										})}
									</TBody>
								</Table>
							</div>
							<StackedRows
								label="Saved filter views"
								rows={views.map(view => {
									const parts = viewParts(view, records);
									return {
										key: view.id,
										title: <p className="font-semibold text-ink">{view.name}</p>,
										fields: [
											{ label: "Zone", value: parts.zone },
											{ label: "Round", value: parts.round },
											{ label: "Play type", value: parts.type },
											{
												label: "Matches now",
												value: matchesNow(view, records, reviews.reviewOf),
												mono: true
											},
											{ label: "Saved by", value: `${view.savedBy} · ${view.savedLabel}` }
										],
										actions: actions(view)
									};
								})}
							/>
						</>
					)}
				</PreviewStateView>
			</Island>
			{offline && (
				<p className="type-small text-ink-2">
					You are offline. Rename, Duplicate and Delete wait until you reconnect.
				</p>
			)}

			<ul className="grid gap-6 px-1.5 md:grid-cols-3">
				{EXPLAINERS.map(entry => (
					<li key={entry.title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
						<Icon name={entry.icon} size={20} className="mt-0.5 text-ink" />
						<span className="min-w-0">
							<span className="block font-semibold text-ink">{entry.title}</span>
							<span className="block type-body text-ink-2">{entry.body}</span>
						</span>
					</li>
				))}
			</ul>
			<Note>
				Review the scope when exporting. A live dataset can change while the saved filter definition remains the
				same.
			</Note>

			<RenameDialog
				view={pending?.kind === "rename" ? pending.view : null}
				taken={views}
				onClose={() => setPending(null)}
				onRename={rename}
			/>
			<Dialog
				open={pending?.kind === "delete"}
				onOpenChange={open => {
					if (!open) setPending(null);
				}}
				title="Delete this saved view?"
				description={
					pending?.kind === "delete" ? `“${pending.view.name}” is removed from the list.` : undefined
				}
				footer={
					<>
						<DialogClose asChild>
							<Button variant="outline">Keep view</Button>
						</DialogClose>
						<Button
							variant="danger-solid"
							icon="trash-2"
							onClick={() => pending?.kind === "delete" && remove(pending.view)}>
							Delete view
						</Button>
					</>
				}>
				<p className="type-body text-ink">
					The observations it matched are not affected. You can save the same filters again from Data.
				</p>
			</Dialog>
		</div>
	);
}

function RenameDialog({
	view,
	taken,
	onClose,
	onRename
}: {
	view: SavedView | null;
	taken: SavedView[];
	onClose: () => void;
	onRename: (view: SavedView, name: string) => void;
}) {
	const id = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [openFor, setOpenFor] = useState<string | null>(null);

	// Start from the view's own name each time the dialog opens for a view.
	if (view && openFor !== view.id) {
		setOpenFor(view.id);
		setName(view.name);
		setError(null);
	}
	if (!view && openFor !== null) setOpenFor(null);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!view) return;
		const next = name.trim();
		const problem =
			next === ""
				? "Name the view, such as North meadow · Round 1."
				: taken.some(entry => entry.id !== view.id && entry.name.toLowerCase() === next.toLowerCase())
					? `A view called “${next}” already exists. Choose another name.`
					: null;
		if (problem) {
			setError(problem);
			inputRef.current?.focus();
			return;
		}
		if (next === view.name) onClose();
		else onRename(view, next);
	}

	return (
		<Dialog
			open={view !== null}
			onOpenChange={open => {
				if (!open) onClose();
			}}
			title="Rename saved view"
			description="The filters stay the same. Only the name changes."
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" form={`${id}-form`} icon="check">
						Rename view
					</Button>
				</>
			}>
			<form id={`${id}-form`} noValidate onSubmit={submit}>
				<Field label="Name" htmlFor={`${id}-name`} error={error}>
					<TextInput
						ref={inputRef}
						autoComplete="off"
						value={name}
						onChange={event => {
							setName(event.target.value);
							if (error) setError(null);
						}}
					/>
				</Field>
			</form>
		</Dialog>
	);
}
