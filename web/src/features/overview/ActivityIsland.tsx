"use client";

import { Island } from "@/components/contour/Island";
import { TextLink } from "@/components/contour/TextLink";
import { Timeline } from "@/components/contour/Timeline";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import type { ActivityItem } from "@/fixtures";

/** Recent field activity (project-01): uploads, rejections, packages and drafts, newest first. */
export function ActivityIsland({ items, dataHref }: { items: ActivityItem[]; dataHref: string }) {
	return (
		<Island
			flush
			divided={false}
			title="Recent field activity"
			actions={<TextLink href={dataHref}>All observations</TextLink>}>
			<PreviewStateView
				loadingLabel="Loading recent activity…"
				rows={4}
				headingLevel={3}
				empty={{
					icon: "list",
					title: "No field activity yet",
					body: "Uploads, rejected records, map packages and form drafts appear here as they happen."
				}}>
				<div className="px-island-pad pt-1 pb-island-pad">
					{items.length === 0 ? (
						<p className="type-body text-ink-2">No field activity yet.</p>
					) : (
						<Timeline
							items={items.map(item => ({
								tone: item.tone,
								title: item.title,
								detail: item.detail,
								time: item.time,
								id: `${item.title}-${item.time}`
							}))}
						/>
					)}
				</div>
			</PreviewStateView>
		</Island>
	);
}
