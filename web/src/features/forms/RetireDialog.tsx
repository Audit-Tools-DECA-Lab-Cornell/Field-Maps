"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { RadioRows } from "@/components/contour/RadioRows";
import { useToast } from "@/components/contour/Toast";

import { useFormWriteBlock } from "./CreateDraftDialog";
import { allVersions, plural } from "./model";
import { markRetired, unmarkRetired, useFormsPreview } from "./store";

/**
 * "Retire a version" (project-12): stops new sessions on a published version. Every consequence is listed
 * before the confirm; the version stays readable for the observations that used it.
 */
export function RetireDialog() {
	const preview = useFormsPreview();
	const blocked = useFormWriteBlock();
	const toast = useToast();
	const published = allVersions(preview).filter(version => version.state === "published");
	const [open, setOpen] = useState(false);
	const [choice, setChoice] = useState("");
	const chosen = published.find(version => version.id === choice) ?? published[0];

	const reason =
		blocked ?? (published.length === 0 ? "No version is published, so there is nothing to retire." : null);
	if (reason || !chosen)
		return (
			<Button variant="outline" icon="held" disabled disabledReason={reason ?? undefined}>
				Retire a version
			</Button>
		);

	function submit(event: FormEvent) {
		event.preventDefault();
		if (!chosen) return;
		const id = chosen.id;
		markRetired(id);
		setOpen(false);
		toast({
			title: `${id} is retired in this preview`,
			description: "No new sessions start on it. Its observations keep it.",
			action: { label: "Undo", onClick: () => unmarkRetired(id) }
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
			title="Retire a version"
			description="A retired version takes no new sessions. Nothing it collected changes."
			trigger={
				<Button variant="outline" icon="held">
					Retire a version
				</Button>
			}>
			<form onSubmit={submit} className="flex flex-col gap-6">
				<RadioRows
					label="Published version to retire"
					value={chosen.id}
					onValueChange={setChoice}
					options={published.map(version => ({
						value: version.id,
						label: <span className="type-mono-data">{version.id}</span>,
						description: `${version.formTitle} · ${
							version.observations > 0 ? `${plural(version.observations, "observation")}` : "not in use"
						}`
					}))}
				/>
				<div>
					<p className="type-body font-semibold text-ink">What retiring {chosen.id} does</p>
					<ul className="mt-2 flex list-disc flex-col gap-1 pl-5 type-body text-ink-2">
						<li>No new collection session starts on it.</li>
						<li>Sessions already running on it keep it until they end.</li>
						<li>
							{chosen.observations > 0
								? `Its ${plural(chosen.observations, "observation")} keep ${chosen.id} and stay readable.`
								: "It collected no observations, so no record is affected."}
						</li>
						<li>Its GIS fields keep their stable IDs and definitions.</li>
					</ul>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-3">
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" icon="held">
						Retire {chosen.id}
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
