"use client";

import { useState } from "react";

import { SecondaryAction } from "@/components/nocturne/chrome";

/** Connection details are copied, not retyped: a transposed port is an afternoon lost. */
export function CopyField({ label, value }: { readonly label: string; readonly value: string }) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard access can be refused; the value is on screen and selectable either way.
			setCopied(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-snug">
			<code
				className="min-w-0 flex-1 overflow-x-auto rounded-md border border-rule bg-raised px-snug py-tight text-caption text-neutral-300"
				translate="no">
				{value}
			</code>
			<SecondaryAction onClick={copy} className="min-h-9 px-base text-detail">
				{copied ? "Copied" : `Copy ${label}`}
			</SecondaryAction>
			<span aria-live="polite" className="sr-only">
				{copied ? `${label} copied to the clipboard` : ""}
			</span>
		</div>
	);
}
