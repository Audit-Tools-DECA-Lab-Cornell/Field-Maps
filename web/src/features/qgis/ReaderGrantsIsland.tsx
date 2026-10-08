"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { FactsList } from "@/components/contour/FactsList";
import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { Select } from "@/components/contour/Select";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { TextInput } from "@/components/contour/TextInput";
import { useToast } from "@/components/contour/Toast";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { StackedRows } from "@/features/team/StackedRows";
import { formatDay, PREVIEW_NOW, type ReaderGrant } from "@/fixtures";

import { useReaderGrants } from "./store";

const PRIVILEGE = "Read only · typed views";

/** Expiry choices, counted from the preview snapshot: "Nov 01", "Dec 01", "Dec 31". */
const EXPIRY_DAYS = [30, 60, 90] as const;

function expiryOptions(): string[] {
	return EXPIRY_DAYS.map(days => formatDay(new Date(PREVIEW_NOW.getTime() + days * 86_400_000)));
}

export type ReaderGrantsIslandProps = { project: string; projectName: string };

/**
 * Reader access grants (project-05): scoped, read-only QGIS access to typed views of accepted
 * observations. Adding or revoking a reader changes this preview only; no credential is made.
 */
export function ReaderGrantsIsland({ project, projectName }: ReaderGrantsIslandProps) {
	const { grants, add, revoke, restore } = useReaderGrants(project);
	const { toast } = useToast();
	const { offline, can, screenState } = usePreview();
	const manage = can("editProject");
	const disabled = offline || !manage || screenState === "loading" || screenState === "error";
	const reason = !manage
		? "Your role can read and export. A project manager manages reader access."
		: offline
			? "You are offline. Reader access cannot change until you reconnect."
			: undefined;
	const scope = `${projectName} only`;

	function revokeGrant(grant: ReaderGrant) {
		revoke(grant.reader);
		toast({
			title: `${grant.reader} no longer has reader access`,
			description: "Revoked in this preview only.",
			action: { label: "Undo", altText: "Undo the revoke", onClick: () => restore(grant.reader) }
		});
	}

	return (
		<Island
			flush
			className="relative"
			title="Reader access grants"
			actions={
				<AddReaderDialog
					scope={scope}
					disabled={disabled}
					taken={grants.map(grant => grant.reader)}
					onAdd={grant => {
						add(grant);
						toast({
							title: `Reader access added for ${grant.reader}`,
							description: "In this preview only. No credential was created.",
							tone: "saved"
						});
					}}
				/>
			}>
			{reason && screenState === "normal" && (
				<p className="border-t border-rule px-island-pad py-3 type-small text-ink-2">{reason}</p>
			)}
			<PreviewStateView
				loadingLabel="Loading reader access…"
				rows={1}
				headingLevel={3}
				empty={{
					icon: "key-round",
					title: "No reader access yet",
					body: "Add a reader to give an analyst a read-only QGIS layer of this project's accepted observations."
				}}>
				{grants.length === 0 ? (
					<p className="border-t border-rule px-island-pad py-5 type-body text-ink-2">
						No reader has access. Add reader gives an analyst a read-only layer.
					</p>
				) : (
					<>
						<div className="hidden sm:block">
							<Table caption="Reader access grants">
								<THead>
									<tr>
										<Th>Reader</Th>
										<Th>Project scope</Th>
										<Th>Privilege</Th>
										<Th>Expiry</Th>
										<Th>
											<span className="sr-only">Actions</span>
										</Th>
									</tr>
								</THead>
								<TBody>
									{grants.map(grant => (
										<Tr key={grant.reader}>
											<Td>
												<span className="inline-flex items-center gap-2.5 font-semibold">
													<Icon name="key-round" size={18} className="shrink-0" />
													{grant.reader}
												</span>
											</Td>
											<Td>{grant.scope}</Td>
											<Td>{grant.privilege}</Td>
											<Td nowrap>{grant.expiry}</Td>
											<Td className="text-right">
												<ReviewAccessDialog
													grant={grant}
													disabled={disabled}
													onRevoke={() => revokeGrant(grant)}
												/>
											</Td>
										</Tr>
									))}
								</TBody>
							</Table>
						</div>
						<StackedRows
							label="Reader access grants"
							rows={grants.map(grant => ({
								key: grant.reader,
								title: (
									<span className="inline-flex items-center gap-2.5 font-semibold text-ink">
										<Icon name="key-round" size={18} className="shrink-0" />
										{grant.reader}
									</span>
								),
								fields: [
									{ label: "Project scope", value: grant.scope },
									{ label: "Privilege", value: grant.privilege },
									{ label: "Expiry", value: grant.expiry }
								],
								actions: (
									<ReviewAccessDialog
										grant={grant}
										disabled={disabled}
										onRevoke={() => revokeGrant(grant)}
									/>
								)
							}))}
						/>
					</>
				)}
			</PreviewStateView>
		</Island>
	);
}

function AddReaderDialog({
	scope,
	disabled,
	taken,
	onAdd
}: {
	scope: string;
	disabled: boolean;
	taken: string[];
	onAdd: (grant: ReaderGrant) => void;
}) {
	const id = useId();
	const nameRef = useRef<HTMLInputElement>(null);
	const options = expiryOptions();
	const [open, setOpen] = useState(false);
	const [reader, setReader] = useState("");
	const [expiry, setExpiry] = useState(options[0] ?? "");
	const [error, setError] = useState<string | null>(null);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const name = reader.trim();
		const problem =
			name === ""
				? "Name the reader, such as Research analyst or a person's name."
				: taken.some(entry => entry.toLowerCase() === name.toLowerCase())
					? `${name} already has reader access. Review it in the list instead.`
					: null;
		if (problem) {
			setError(problem);
			nameRef.current?.focus();
			return;
		}
		onAdd({ reader: name, scope, privilege: PRIVILEGE, expiry });
		setOpen(false);
		setReader("");
		setError(null);
	}

	if (disabled)
		return (
			<Button variant="outline" icon="plus" disabled>
				Add reader
			</Button>
		);

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				if (!next) {
					setReader("");
					setError(null);
				}
			}}
			title="Add reader"
			description="A reader gets a typed, read-only QGIS layer of accepted observations. They cannot change records."
			trigger={
				<Button variant="outline" icon="plus">
					Add reader
				</Button>
			}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" form={`${id}-form`} icon="check">
						Add reader
					</Button>
				</>
			}>
			<form id={`${id}-form`} noValidate onSubmit={submit} className="flex flex-col gap-5">
				<Field label="Reader" htmlFor={`${id}-reader`} error={error} hint="A role or a person's name.">
					<TextInput
						ref={nameRef}
						autoComplete="off"
						placeholder="e.g. Research analyst"
						value={reader}
						onChange={event => {
							setReader(event.target.value);
							if (error) setError(null);
						}}
					/>
				</Field>
				<Field label="Expiry" htmlFor={`${id}-expiry`} hint="Access ends on this day. Renew it to keep it.">
					<Select value={expiry} onChange={event => setExpiry(event.target.value)}>
						{options.map(option => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</Select>
				</Field>
				<FactsList
					labelWidth="minmax(7rem, 40%)"
					items={[
						{ label: "Project scope", value: scope },
						{ label: "Privilege", value: PRIVILEGE }
					]}
				/>
			</form>
		</Dialog>
	);
}

function ReviewAccessDialog({
	grant,
	disabled,
	onRevoke
}: {
	grant: ReaderGrant;
	disabled: boolean;
	onRevoke: () => void;
}) {
	return (
		<Dialog
			title={`Review access · ${grant.reader}`}
			description="What this reader can see in QGIS, and until when."
			trigger={
				<Button variant="outline" icon="shield-check" aria-label={`Review access, ${grant.reader}`}>
					Review access
				</Button>
			}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Close</Button>
					</DialogClose>
					{!disabled && (
						<DialogClose asChild>
							<Button variant="ink" icon="x" onClick={onRevoke}>
								Revoke access
							</Button>
						</DialogClose>
					)}
				</>
			}>
			<div className="flex flex-col gap-4">
				<FactsList
					labelWidth="minmax(7rem, 40%)"
					items={[
						{ label: "Reader", value: grant.reader },
						{ label: "Project scope", value: grant.scope },
						{ label: "Privilege", value: grant.privilege },
						{ label: "Expiry", value: grant.expiry }
					]}
				/>
				<Note>Revoking stops the next layer refresh. Files the reader already exported stay with them.</Note>
			</div>
		</Dialog>
	);
}
