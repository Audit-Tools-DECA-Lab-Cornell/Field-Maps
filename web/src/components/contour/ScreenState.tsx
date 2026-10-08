import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "./Icon";
import { Skeleton } from "./Skeleton";
import { TONE_SOFT, TONE_TEXT } from "./tone";

export type ScreenStateKind = "loading" | "empty" | "filtered" | "error" | "offline" | "no-access";

type MessageKind = Exclude<ScreenStateKind, "loading" | "offline">;

/* The designed web states, word for word (system-06, DESIGN §7). Screens pass their own words where the
   subject is not observations or a map package. */
const MESSAGE: Record<MessageKind, { icon: IconName; title: string; body: string }> = {
	filtered: {
		icon: "funnel",
		title: "No observations match this view",
		body: "Change your filters to see more observations. Your underlying records are unchanged."
	},
	empty: {
		icon: "layers",
		title: "No map package yet",
		body: "This site has no map. Upload a QGIS package to give observers something to collect on."
	},
	error: {
		icon: "triangle-alert",
		title: "We could not load this page",
		body: "Nothing was removed. Check your connection and try again."
	},
	"no-access": {
		icon: "lock",
		title: "You do not have access to this page",
		body: "Your current role can view project observations, but cannot change this area. Ask a project manager to review your access."
	}
};

const LOADING_LABEL = "Loading observations…";
const OFFLINE_TITLE = "You are offline.";

function offlineBody(loadedAt?: string): string {
	return loadedAt
		? `Showing what loaded at ${loadedAt}. Changes cannot be saved.`
		: "Showing what already loaded. Changes cannot be saved.";
}

/* Placeholder widths per row, so the still rows read as table rows of differing lengths. */
const MIDDLE_BAR = ["w-26", "w-20", "w-23", "w-18"];

export type ScreenStateProps = {
	kind: ScreenStateKind;
	/** Replaces the designed title. For offline, the bold opening sentence ("You are offline."). */
	title?: ReactNode;
	/** Replaces the designed body. For offline, the rest of the banner. */
	body?: ReactNode;
	/** At most two Buttons: the way forward first ("Try again"), then the way out ("Return to projects"). */
	actions?: ReactNode;
	/** Replaces the designed glyph in the disc (or, offline, in the banner). */
	icon?: IconName;
	/** The line under the placeholders, naming what is loading. Ends with one ellipsis character. */
	loadingLabel?: string;
	/** Placeholder rows while loading, laid out like the rows they replace. */
	rows?: number;
	/** Offline: the time the shown content loaded, "11:36". */
	loadedAt?: string;
	/** Heading level of the title, one below the island's own title. */
	headingLevel?: 2 | 3 | 4;
	/** Offline: the content that loaded, kept on screen under the banner. Ignored by the other kinds. */
	children?: ReactNode;
	className?: string;
};

/**
 * What a data area shows when it is not full of data (system-06): loading, empty, empty after
 * filtering, error, offline and no access. It replaces the body of a flush Island, keeping the island's
 * header and the page around it, and pads itself. Plain words, one icon disc, no illustration; loading
 * draws still placeholders that appear only after the skeleton delay, so a fast load shows nothing.
 */
export function ScreenState({
	kind,
	title,
	body,
	actions,
	icon,
	loadingLabel = LOADING_LABEL,
	rows = 4,
	loadedAt,
	headingLevel = 3,
	children,
	className
}: ScreenStateProps) {
	if (kind === "loading") {
		return (
			// The fade-in waits out the skeleton delay with its first frame (opacity 0) held, in CSS alone.
			<div
				aria-busy="true"
				className={cx("animate-fade-in [animation-delay:var(--ct-duration-skeleton-delay)]", className)}>
				<div aria-hidden="true">
					{Array.from({ length: rows }, (_, index) => (
						<div
							key={index}
							className="grid h-table-row grid-cols-3 items-center gap-x-8 border-t border-rule px-island-pad first:border-t-0">
							<Skeleton className="h-3 w-20 max-w-full" />
							<Skeleton className={cx("h-3 max-w-full", MIDDLE_BAR[index % MIDDLE_BAR.length])} />
							<Skeleton className="h-3 w-26 max-w-full" />
						</div>
					))}
				</div>
				<p className={cx("px-island-pad py-4 type-small text-ink", rows > 0 && "border-t border-rule")}>
					{loadingLabel}
				</p>
			</div>
		);
	}

	if (kind === "offline") {
		return (
			<div className={className}>
				<div
					role="status"
					className={cx("flex items-start gap-3 px-island-pad py-4 type-body text-ink", TONE_SOFT.waiting)}>
					<Icon name={icon ?? "wifi-off"} size={18} className={cx("mt-0.75 shrink-0", TONE_TEXT.waiting)} />
					<div className="min-w-0">
						<strong className="font-semibold">{title ?? OFFLINE_TITLE}</strong>{" "}
						{body ?? offlineBody(loadedAt)}
					</div>
				</div>
				{children}
				{actions != null && (
					<div className="flex flex-wrap items-center gap-3 border-t border-rule px-island-pad py-4">
						{actions}
					</div>
				)}
			</div>
		);
	}

	const message = MESSAGE[kind];
	const Heading = `h${headingLevel}` as const;
	const error = kind === "error";

	return (
		<div
			role={error ? "alert" : undefined}
			className={cx("flex flex-col items-start px-island-pad py-14", className)}>
			<span
				className={cx(
					"grid size-14 shrink-0 place-items-center rounded-pill",
					error ? "bg-attention-soft text-attention" : "bg-well text-ink"
				)}>
				<Icon name={icon ?? message.icon} size={24} />
			</span>
			<Heading className="mt-4 type-island text-ink">{title ?? message.title}</Heading>
			<div className="mt-2 max-w-prose type-body text-ink-2">{body ?? message.body}</div>
			{actions != null && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
		</div>
	);
}
