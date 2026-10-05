"use client";

import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { TextLink } from "@/components/contour/TextLink";
import { TONE_TEXT } from "@/components/contour/tone";
import { plural } from "@/features/data/filters";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import type { BlockingItem } from "@/fixtures";

/**
 * What is blocking (project-01): what stands between the project and a complete field return, in the
 * order a manager can act on it. The Field return's "upload needs a correction" link lands here.
 */
export function BlockingIsland({ items }: { items: BlockingItem[] }) {
	const { screenState } = usePreview();
	// The count describes the rows below it, so it shows only while they do.
	const live = screenState === "normal" || screenState === "offline";
	return (
		<Island
			id="blocking"
			flush
			title="What is blocking"
			meta={live ? `${items.length} ${plural(items.length, "item")}` : undefined}
			className="scroll-mt-6">
			<PreviewStateView
				loadingLabel="Loading what is blocking…"
				rows={3}
				headingLevel={3}
				empty={{
					icon: "check",
					title: "Nothing is blocking",
					body: "No upload needs a correction, every form in use is published and every device has reported."
				}}>
				{items.length === 0 ? (
					<p className="px-island-pad py-6 type-body text-ink-2">Nothing is blocking the field return.</p>
				) : (
					<ul className="divide-y divide-rule">
						{items.map(item => (
							<li
								key={item.title}
								className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-island-pad py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
								<Icon
									name={item.icon}
									size={20}
									className={`mt-0.5 shrink-0 ${TONE_TEXT[item.tone]}`}
								/>
								<div className="min-w-0">
									<p className="font-semibold text-ink">{item.title}</p>
									<p className="type-small text-ink-2">{item.detail}</p>
								</div>
								<div className="col-start-2 sm:col-start-3 sm:row-start-1 sm:text-right">
									{item.action ? (
										<TextLink href={item.action.href}>{item.action.label}</TextLink>
									) : (
										<span className="type-small text-ink-2">{item.meta}</span>
									)}
								</div>
							</li>
						))}
					</ul>
				)}
			</PreviewStateView>
		</Island>
	);
}
