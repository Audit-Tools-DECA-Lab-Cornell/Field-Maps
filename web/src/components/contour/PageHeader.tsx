import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/** The page title's id. Navigation moves focus here, so a screen reader starts at the new page. */
export const PAGE_TITLE_ID = "page-title";

export type PageHeaderProps = {
	title: ReactNode;
	/** One line under the title saying what the page is for: "One filter set for the map, table and export." */
	lead?: ReactNode;
	breadcrumbs?: Crumb[];
	/** Buttons on the right, level with the bottom of the title block. At most one is primary. */
	actions?: ReactNode;
	/** Badges beside the title, such as the upload and review states of OBS-0244. */
	titleAddon?: ReactNode;
	/** Set the title in mono, for an ID as the page title (OBS-0244). */
	titleMono?: boolean;
	className?: string;
};

/**
 * The top of a workspace page: breadcrumbs, the h1 with an optional lead line, and the page's actions
 * (project-02, project-03, project-10). On narrow screens the actions drop below the title.
 */
export function PageHeader({
	title,
	lead,
	breadcrumbs,
	actions,
	titleAddon,
	titleMono = false,
	className
}: PageHeaderProps) {
	return (
		<header className={cx("flex flex-col gap-2", className)}>
			{breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
			<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<h1
							id={PAGE_TITLE_ID}
							tabIndex={-1}
							className={cx("min-w-0 text-ink", titleMono ? "type-mono-title" : "type-page")}>
							{title}
						</h1>
						{titleAddon != null && (
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1">{titleAddon}</div>
						)}
					</div>
					{lead != null && <div className="mt-2 type-body text-ink-2 lg:type-lead">{lead}</div>}
				</div>
				{actions != null && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
			</div>
		</header>
	);
}
