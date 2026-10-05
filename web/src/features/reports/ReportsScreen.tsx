"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/contour/Button";
import { Icon, type IconName } from "@/components/contour/Icon";
import { Island, IslandSection } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ProposalNote } from "@/components/contour/ProposalNote";
import { TextLink } from "@/components/contour/TextLink";
import { useReviews } from "@/features/data/review";
import { savedViewsStore } from "@/features/data/savedViews";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { useSessionStore } from "@/features/shell/useSessionStore";
import { formatDay, observationsFor, PREVIEW_NOW, type PrintableReport } from "@/fixtures";

import { matchesNow, viewDetail, viewHref } from "./views";

export type ReportsScreenProps = {
	org: string;
	project: string;
	reports: PrintableReport[];
};

const ROW =
	"grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-island-pad py-4 " +
	"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-ground " +
	"[--ct-size-focus-gap:calc(var(--ct-size-focus-ring)*-2)]";

function RowLink({
	href,
	icon,
	title,
	detail,
	end
}: {
	href: string;
	icon: IconName;
	title: string;
	detail: string;
	end: ReactNode;
}) {
	return (
		<Link href={href} className={ROW}>
			<span aria-hidden="true" className="flex size-11 items-center justify-center rounded-pill bg-well text-ink">
				<Icon name={icon} size={20} />
			</span>
			<span className="min-w-0">
				<span className="block type-island text-ink">{title}</span>
				<span className="block type-small text-ink-2">{detail}</span>
			</span>
			<span className="flex items-center gap-4">
				{end}
				<Icon name="chevron-right" size={20} className="shrink-0 text-ink" />
			</span>
		</Link>
	);
}

/**
 * Reports and saved views (project-15, proposal U7): printable summaries of what the server holds, and the
 * filter sets saved on Data with how many records match each one now.
 */
export function ReportsScreen({ org, project, reports }: ReportsScreenProps) {
	const { screenState } = usePreview();
	const views = useSessionStore(savedViewsStore);
	const reviews = useReviews();
	const records = observationsFor(project);
	const base = projectHref(org, project);
	const live = screenState === "normal" || screenState === "offline";
	const snapshot = formatDay(PREVIEW_NOW);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Reports and saved views"
				lead="Printable research summaries and reusable filter sets."
				actions={
					<ButtonLink href={`${base}/data`} icon="plus">
						Create a view from data
					</ButtonLink>
				}
			/>
			<ProposalNote code="U7" inline>
				Reporting starts with printable summaries and saved views. Scheduled or emailed reports are not part of
				the pilot.
			</ProposalNote>
			<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
				<Island
					flush
					title="Printable summaries"
					meta={live ? `${reports.length} ${reports.length === 1 ? "summary" : "summaries"}` : undefined}>
					<PreviewStateView
						loadingLabel="Loading summaries…"
						rows={2}
						headingLevel={3}
						empty={{
							icon: "file-text",
							title: "No printable summaries yet",
							body: "A summary appears once observations are uploaded. Records still on devices are never in it."
						}}
						filtered={{
							title: "No summaries match this view",
							body: "Change your filters to see more summaries. The summaries are unchanged."
						}}>
						<ul className="divide-y divide-rule">
							{reports.map(report => (
								<li key={report.slug}>
									<RowLink
										href={`${base}/reports/${report.slug}`}
										icon="file-text"
										title={report.title}
										detail={`${report.scope} · snapshot ${snapshot}`}
										end={
											<span className="inline-flex items-center gap-1.5 type-small font-semibold text-saved">
												<Icon name="printer" size={16} className="shrink-0" />
												Printable
											</span>
										}
									/>
								</li>
							))}
						</ul>
					</PreviewStateView>
				</Island>
				<Island
					flush
					title="Saved views"
					meta={live ? `${views.length} ${views.length === 1 ? "view" : "views"}` : undefined}>
					<PreviewStateView
						loadingLabel="Loading saved views…"
						rows={2}
						headingLevel={3}
						empty={{
							icon: "funnel",
							title: "No saved views yet",
							body: "Save a filter set on Data to open it again later. A view keeps filters, not records.",
							actions: (
								<ButtonLink href={`${base}/data`} variant="outline" iconRight="arrow-right">
									Open data
								</ButtonLink>
							)
						}}
						filtered={{
							title: "No saved views match this view",
							body: "Change your filters to see more views. Your saved views are unchanged."
						}}>
						{views.length === 0 ? (
							<p className="px-island-pad py-5 type-body text-ink-2">
								No saved views yet. Save a filter set on Data to see it here.
							</p>
						) : (
							<ul className="divide-y divide-rule">
								{views.map(view => {
									const count = matchesNow(view, records, reviews.reviewOf);
									return (
										<li key={view.id}>
											<RowLink
												href={viewHref(`${base}/data`, view)}
												icon="funnel"
												title={view.name}
												detail={viewDetail(view, records)}
												end={
													<span className="type-mono-data whitespace-nowrap text-ink-2">
														{count} now
														<span className="sr-only">
															{count === 1 ? " record matches" : " records match"}
														</span>
													</span>
												}
											/>
										</li>
									);
								})}
							</ul>
						)}
						<IslandSection rule className="py-4">
							<TextLink href={`${base}/reports/views`} icon="list" arrow={false}>
								Manage saved views
							</TextLink>
						</IslandSection>
					</PreviewStateView>
				</Island>
			</div>
			<p className="max-w-3xl px-1.5 type-body text-ink-2">
				A summary prints what the server holds at that moment. Records still on devices are never in it, and
				each printout states its snapshot time, form version and map version.
			</p>
		</div>
	);
}
