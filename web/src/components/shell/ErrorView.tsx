"use client";

import { useParams, usePathname } from "next/navigation";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { FactsList } from "@/components/contour/FactsList";
import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { PAGE_TITLE_ID } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { orgHref, pageNameOf } from "@/features/shell/navigation";
import { DEFAULT_ORG, formatDayTime, getOrg } from "@/fixtures";

/**
 * A reference the reader can send on: "REQ-" and the first six characters of the error's digest, which
 * matches the server log. A client error has no digest, so its message stands in.
 */
export function requestReference(error: Error & { digest?: string }): string {
	let source = (error.digest ?? "").replace(/[^a-z0-9]/gi, "");
	if (source.length < 6) {
		let hash = 0;
		for (const char of `${error.name}:${error.message}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
		source = hash.toString(16).padStart(6, "0");
	}
	const code = source.toUpperCase();
	return `REQ-${code.slice(0, 4)}-${code.slice(4, 6)}`;
}

export type ErrorViewProps = {
	error: Error & { digest?: string };
	/** Fetches and renders the page again. */
	retry: () => void;
};

/**
 * "Something went wrong." (org-19): the page could not load, the records are safe, and what to do. The
 * facts name the page, the time and a reference the organization owner can trace.
 */
export function ErrorView({ error, retry }: ErrorViewProps) {
	const pathname = usePathname();
	const params = useParams<{ org?: string }>();
	const org = params?.org && getOrg(params.org) ? params.org : DEFAULT_ORG;
	// The moment the error was shown, fixed for the life of this view.
	const [when] = useState(() => formatDayTime(new Date()));

	return (
		<div className="mx-auto grid max-w-6xl gap-10 py-8 lg:grid-cols-2 lg:gap-14 lg:py-14">
			<div className="flex flex-col items-start">
				<span className="grid size-20 place-items-center rounded-pill border border-attention bg-attention-soft text-attention">
					<Icon name="triangle-alert" size={32} />
				</span>
				<p className="mt-8 type-mono-label text-ink-2">Request interrupted</p>
				<h1 id={PAGE_TITLE_ID} tabIndex={-1} className="mt-2 type-page text-ink md:type-hero">
					Something went wrong.
				</h1>
				<p className="mt-4 max-w-xl type-lead text-ink-2">
					Your records remain available. Try again or return to the workspace.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<Button icon="rotate-cw" onClick={retry}>
						Try again
					</Button>
					<ButtonLink href={orgHref(org)} variant="outline" icon="arrow-left">
						Return to projects
					</ButtonLink>
				</div>
			</div>
			<Island
				title="What we know"
				divided
				className="self-start lg:mt-6"
				footnote={
					<>
						If it keeps happening, send the reference to your organization owner. Records on devices are not
						affected by a web error.
					</>
				}>
				<FactsList
					labelWidth="8.5rem"
					items={[
						{ label: "Page", value: pageNameOf(pathname) },
						{ label: "When", value: <span suppressHydrationWarning>{when}</span> },
						{ label: "What failed", value: "The page could not load its records" },
						{
							label: "Your data",
							value: <StateBadge kind="readiness" state="verified" label="Records remain available" />
						},
						{ label: "Reference", value: requestReference(error), mono: true }
					]}
				/>
			</Island>
		</div>
	);
}
