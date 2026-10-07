"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";
import { PageHeader } from "@/components/contour/PageHeader";
import { Select } from "@/components/contour/Select";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextInput } from "@/components/contour/TextInput";
import { useToast } from "@/components/contour/Toast";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { useLeaveGuard } from "@/features/shell/useLeaveGuard";
import { VIEWER } from "@/fixtures";
import { cx } from "@/lib/cx";

import { DangerZone } from "./DangerZone";
import { type ProjectSettings, type PublicationScope, SCOPE_LABEL, useProjectSettings } from "./store";

export type SettingsScreenProps = { org: string; project: string };

type Form = {
	name: string;
	code: string;
	timezone: string;
	roundsPerZone: string;
	observationsPerRound: string;
	publicationScope: PublicationScope;
};

type Errors = Partial<Record<keyof Form, string>>;

const TIMEZONES = [
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"America/Toronto",
	"Europe/London",
	"Europe/Berlin",
	"Asia/Kolkata",
	"Australia/Sydney",
	"UTC"
];

const OFFLINE_REASON = "You are offline. Changes cannot be saved until you reconnect.";

const STATE_REASON: Partial<Record<string, string>> = {
	loading: "The settings are still loading.",
	error: "The settings did not load. Try again first.",
	"no-access": "Your role cannot change this project."
};

function formOf(settings: ProjectSettings): Form {
	return {
		name: settings.name,
		code: settings.code,
		timezone: settings.timezone,
		roundsPerZone: String(settings.roundsPerZone),
		observationsPerRound: String(settings.observationsPerRound),
		publicationScope: settings.publicationScope
	};
}

function wholeNumber(value: string, max: number): number | null {
	if (!/^\d+$/.test(value.trim())) return null;
	const number = Number(value.trim());
	return number >= 1 && number <= max ? number : null;
}

function validate(form: Form): Errors {
	const errors: Errors = {};
	if (form.name.trim() === "") errors.name = "Enter a project name.";
	else if (form.name.trim().length > 60) errors.name = "Keep the name to 60 characters or fewer.";
	if (!/^[A-Z0-9][A-Z0-9-]{1,11}$/.test(form.code))
		errors.code = "Use 2 to 12 capital letters, digits and hyphens, such as PLAY-26.";
	if (wholeNumber(form.roundsPerZone, 10) === null) errors.roundsPerZone = "Enter a whole number from 1 to 10.";
	if (wholeNumber(form.observationsPerRound, 50) === null)
		errors.observationsPerRound = "Enter a whole number from 1 to 50.";
	return errors;
}

/**
 * Project settings (project-19): the project's name, code and timezone, the illustrative coverage target and
 * the QGIS publishing mode, with archive and deletion beside them. Unsaved changes say so and leaving asks
 * first. Saving changes this preview only.
 */
export function SettingsScreen({ org, project }: SettingsScreenProps) {
	const id = useId();
	const router = useRouter();
	const { toast } = useToast();
	const { screenState, offline } = usePreview();
	const { settings, update } = useProjectSettings(org, project);
	const saved = formOf(settings);
	// Only the fields changed here; the rest read the saved settings, which arrive after hydration.
	const [draft, setDraft] = useState<Partial<Form>>({});
	const [errors, setErrors] = useState<Errors>({});
	const refs = useRef<Partial<Record<keyof Form, HTMLElement | null>>>({});
	const form: Form = { ...saved, ...draft };
	const dirty = (Object.keys(draft) as (keyof Form)[]).some(key => draft[key] !== saved[key]);
	const guard = useLeaveGuard(dirty);
	const reason = offline ? OFFLINE_REASON : STATE_REASON[screenState];
	const base = projectHref(org, project);

	function set<K extends keyof Form>(key: K, value: Form[K]) {
		setDraft(current => ({ ...current, [key]: value }));
		if (errors[key]) setErrors(current => ({ ...current, [key]: undefined }));
	}

	function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (reason) return;
		if (!dirty) {
			toast({ title: "No changes to save", description: "The settings are as they were last saved." });
			return;
		}
		const found = validate(form);
		setErrors(found);
		const first = (Object.keys(found) as (keyof Form)[])[0];
		if (first) {
			refs.current[first]?.focus();
			return;
		}
		const previous = settings;
		update({
			name: form.name.trim(),
			code: form.code,
			timezone: form.timezone,
			roundsPerZone: Number(form.roundsPerZone.trim()),
			observationsPerRound: Number(form.observationsPerRound.trim()),
			publicationScope: form.publicationScope,
			lastSaved: { by: VIEWER.initials, label: "just now" }
		});
		setDraft({});
		toast({
			title: "Settings saved in this preview",
			description: "Nothing is sent to the FieldMaps database.",
			tone: "saved",
			action: { label: "Undo", altText: "Undo the save", onClick: () => update(previous) }
		});
	}

	const savedLine =
		settings.lastSaved.label === "just now"
			? `Saved just now by ${settings.lastSaved.by}`
			: `Last saved ${settings.lastSaved.label} by ${settings.lastSaved.by}`;
	const timezones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Project settings"
				lead="Project identity, coverage targets and analyst publication scope."
			/>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
				<Island flush title="General" divided={false}>
					<PreviewStateView
						loadingLabel="Loading settings…"
						rows={5}
						headingLevel={3}
						empty={{
							icon: "settings",
							title: "No settings yet",
							body: "This project has no saved settings. Name it and set its code to start."
						}}>
						<form
							noValidate
							onSubmit={save}
							className={cx("flex flex-col gap-6 px-island-pad pb-island-pad", offline && "pt-5")}>
							<div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
								<Field label="Project name" htmlFor={`${id}-name`} error={errors.name}>
									<TextInput
										ref={node => {
											refs.current.name = node;
										}}
										autoComplete="off"
										value={form.name}
										onChange={event => set("name", event.target.value)}
									/>
								</Field>
								<Field label="Project code" htmlFor={`${id}-code`} error={errors.code}>
									<TextInput
										ref={node => {
											refs.current.code = node;
										}}
										autoComplete="off"
										spellCheck={false}
										className="font-mono"
										value={form.code}
										onChange={event =>
											set("code", event.target.value.toUpperCase().replace(/\s/g, ""))
										}
									/>
								</Field>
							</div>
							<Field
								label="Timezone"
								htmlFor={`${id}-timezone`}
								hint="Capture times are shown in this timezone on the web.">
								<Select value={form.timezone} onChange={event => set("timezone", event.target.value)}>
									{timezones.map(zone => (
										<option key={zone} value={zone}>
											{zone}
										</option>
									))}
								</Select>
							</Field>

							<fieldset
								id="coverage"
								className="flex scroll-mt-6 flex-col gap-4 border-t border-rule pt-6">
								<legend className="contents">
									<Mono variant="label" className="text-ink-2">
										Coverage target
									</Mono>
								</legend>
								<div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
									<Field
										label="Rounds per zone"
										htmlFor={`${id}-rounds`}
										error={errors.roundsPerZone}>
										<TextInput
											ref={node => {
												refs.current.roundsPerZone = node;
											}}
											inputMode="numeric"
											autoComplete="off"
											value={form.roundsPerZone}
											onChange={event => set("roundsPerZone", event.target.value)}
										/>
									</Field>
									<Field
										label="Observations per round, at least"
										htmlFor={`${id}-per-round`}
										error={errors.observationsPerRound}>
										<TextInput
											ref={node => {
												refs.current.observationsPerRound = node;
											}}
											inputMode="numeric"
											autoComplete="off"
											value={form.observationsPerRound}
											onChange={event => set("observationsPerRound", event.target.value)}
										/>
									</Field>
								</div>
								<p className="type-small text-ink-2">
									Targets are a design proposal, not scheduled assignments. They only decide how
									coverage is marked.
								</p>
							</fieldset>

							<div className="border-t border-rule pt-6">
								<Field
									label="QGIS publishing mode"
									htmlFor={`${id}-scope`}
									hint="The other option, “Approved only”, is proposal U5 and is not decided.">
									<Select
										value={form.publicationScope}
										onChange={event =>
											set("publicationScope", event.target.value as PublicationScope)
										}>
										<option value="accepted">{SCOPE_LABEL.accepted}</option>
										<option value="approved">{SCOPE_LABEL.approved}</option>
									</Select>
								</Field>
							</div>

							<div className="flex flex-wrap items-start gap-x-4 gap-y-2">
								<Button type="submit" icon="check" disabled={Boolean(reason)} disabledReason={reason}>
									Save settings
								</Button>
								<p role="status" className="mt-3 type-small text-ink-2">
									{dirty ? (
										<StateBadge kind="form" state="draft" label="Unsaved changes" size="sm" />
									) : (
										savedLine
									)}
								</p>
							</div>
						</form>
					</PreviewStateView>
				</Island>

				<div className="flex min-w-0 flex-col gap-6">
					<Island flush aria-label="Round planning">
						<Link
							href={`${base}/settings/rounds`}
							className="flex items-center justify-between gap-4 rounded-island px-island-pad py-5 transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-ground">
							<span className="min-w-0">
								<span className="block type-island text-ink">Round planning</span>
								<span className="block type-small text-ink-2">Optional schedule preview</span>
							</span>
							<span className="flex shrink-0 items-center gap-3">
								<StateBadge kind="proposal" state="open" label="Proposal U6" size="sm" />
								<Icon name="chevron-right" size={20} className="text-ink" />
							</span>
						</Link>
					</Island>
					<DangerZone org={org} project={project} />
				</div>
			</div>

			<Dialog
				open={guard.leavingTo !== null}
				onOpenChange={open => {
					if (!open) guard.stay();
				}}
				title="Leave without saving?"
				description="Your changes to the project settings are not saved. If you leave now, they are lost."
				footer={
					<>
						<DialogClose asChild>
							<Button variant="outline">Keep editing</Button>
						</DialogClose>
						<Button
							variant="ink"
							icon="arrow-right"
							onClick={() => {
								const to = guard.leavingTo;
								setDraft({});
								guard.stay();
								if (to) router.push(to);
							}}>
							Leave without saving
						</Button>
					</>
				}
			/>
		</div>
	);
}
