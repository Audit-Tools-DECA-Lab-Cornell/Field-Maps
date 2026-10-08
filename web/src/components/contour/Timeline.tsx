import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

import { type Tone, TONE_BORDER } from "./tone";

export type TimelineItem = {
	/** The ring's colour. The title carries the meaning; the ring only marks it. */
	tone: Tone;
	title: ReactNode;
	/** One secondary line: identifiers and context ("OBS-0248 · PS · observer code missing"). */
	detail?: ReactNode;
	/** When, with its context ("11:33", "Yesterday"). */
	time?: ReactNode;
	/** A stable key when titles are not unique strings. */
	id?: string;
};

export type TimelineProps = {
	items: TimelineItem[];
	className?: string;
} & Omit<HTMLAttributes<HTMLOListElement>, "children">;

/** Recent events, newest first (project-01, "Recent field activity"): a ring per event joined by a rule. */
export function Timeline({ items, className, ...rest }: TimelineProps) {
	return (
		// role="list" keeps list semantics in Safari, which drops them from unstyled lists.
		<ol role="list" {...rest} className={cx("flex flex-col", className)}>
			{items.map((item, index) => {
				const last = index === items.length - 1;
				return (
					<li key={item.id ?? index} className="flex gap-4">
						<span aria-hidden="true" className="flex w-3 shrink-0 flex-col items-center">
							<span
								className={cx("mt-1.5 size-3 shrink-0 rounded-pill border-2", TONE_BORDER[item.tone])}
							/>
							{!last && <span className="mt-1.5 w-0 flex-1 border-l-2 border-rule" />}
						</span>
						<div
							className={cx(
								"flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4",
								!last && "pb-4"
							)}>
							<div className="min-w-0">
								<div className="font-semibold text-ink">{item.title}</div>
								{item.detail != null && <div className="type-small text-ink-2">{item.detail}</div>}
							</div>
							{item.time != null && <div className="shrink-0 type-mono-data text-ink-2">{item.time}</div>}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
