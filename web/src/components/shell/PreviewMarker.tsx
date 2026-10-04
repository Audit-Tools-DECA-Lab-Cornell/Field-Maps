"use client";

import { useId } from "react";

import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/contour/Popover";
import { Select } from "@/components/contour/Select";
import { usePreview } from "@/features/shell/PreviewProvider";
import { cx } from "@/lib/cx";
import {
	isPreviewRole,
	isPreviewScreenState,
	PREVIEW_ROLES,
	PREVIEW_SCREEN_STATES,
	PREVIEW_TOOLS
} from "@/lib/preview";

/** The marker's sentence, word for word (DESIGN §10, PRODUCT.md § Honesty). */
export const PREVIEW_SENTENCE =
	"Everything here is sample data. Nothing is read from or written to the FieldMaps database.";

function PreviewTools() {
	const id = useId();
	const { role, ownRole, setRole, screenState, setScreenState, reset } = usePreview();
	return (
		<div className="mt-4 flex flex-col gap-4 border-t border-rule pt-4">
			<Field label="View as" htmlFor={`${id}-role`}>
				<Select
					value={role}
					onChange={event => {
						const next = event.target.value;
						if (isPreviewRole(next)) setRole(next === ownRole ? null : next);
					}}>
					{PREVIEW_ROLES.map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</Select>
			</Field>
			<Field label="Show state" htmlFor={`${id}-state`}>
				<Select
					value={screenState}
					onChange={event => {
						const next = event.target.value;
						if (isPreviewScreenState(next)) setScreenState(next);
					}}>
					{PREVIEW_SCREEN_STATES.map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</Select>
			</Field>
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
				<p className="type-small text-ink-2">Resets when this tab closes.</p>
				<button
					type="button"
					onClick={reset}
					className="-mx-3 inline-flex min-h-touch items-center rounded-pill px-3 font-semibold text-accent underline-offset-4 hover:underline">
					Reset
				</button>
			</div>
		</div>
	);
}

/**
 * The quiet "Preview data" pill in the header (D20). It opens the sentence that replaces every per-section
 * fixture notice; development and preview builds add View as, Show state and Reset.
 */
export function PreviewMarker({ className }: { className?: string }) {
	return (
		<Popover>
			<PopoverTrigger
				className={cx(
					"relative inline-flex h-control-sm shrink-0 items-center gap-1.5 rounded-pill border border-dashed border-edge px-3 type-mono-label whitespace-nowrap text-ink-2",
					"before:absolute before:inset-x-0 before:-inset-y-1",
					"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-well data-[state=open]:bg-well",
					className
				)}>
				<Icon name="info" size={16} className="shrink-0" />
				Preview data
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				<h2 className="type-island">Preview data</h2>
				<p className="mt-2 type-body text-ink-2">{PREVIEW_SENTENCE}</p>
				{PREVIEW_TOOLS && <PreviewTools />}
			</PopoverContent>
		</Popover>
	);
}
