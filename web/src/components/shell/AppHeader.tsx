"use client";

import { useParams, usePathname } from "next/navigation";

import { Icon } from "@/components/contour/Icon";
import { IconButton } from "@/components/contour/IconButton";
import { ShortcutHint } from "@/components/contour/Kbd";
import { RoleLabel } from "@/components/contour/RoleLabel";
import { orgHref, scopeOf, showsSampleData } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { useShell } from "@/features/shell/ShellProvider";
import { DEFAULT_ORG, getOrg, getProject } from "@/fixtures";
import { stateOf } from "@/lib/contour";
import { cx } from "@/lib/cx";

import { AccountMenu, type HeaderAccount } from "./AccountMenu";
import { Brand } from "./Brand";
import { PreviewMarker } from "./PreviewMarker";
import { MergedSwitcher, OrgSwitcher, ProjectSwitcher } from "./Switchers";

/**
 * The "Search or jump to" pill. At 1280 and up it reads in full; from 1024 it shortens to "Search";
 * below 1024 it is a round search button (DESIGN §4, Responsive behaviour).
 */
function SearchControl() {
	const { setPaletteOpen } = useShell();
	return (
		<>
			<button
				type="button"
				onClick={() => setPaletteOpen(true)}
				aria-keyshortcuts="Meta+K Control+K"
				className={cx(
					"hidden h-control shrink-0 items-center gap-3 rounded-pill border border-line bg-island pr-3 pl-4 text-left text-ink-2 lg:inline-flex lg:w-48 xl:w-64",
					"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-well"
				)}>
				<Icon name="search" size={18} className="shrink-0 text-ink" />
				<span className="min-w-0 flex-1 type-body whitespace-nowrap">
					<span className="xl:hidden">Search</span>
					<span className="hidden xl:inline">Search or jump to</span>
				</span>
				<ShortcutHint />
			</button>
			<IconButton
				icon="search"
				label="Search or jump to"
				variant="outline"
				onClick={() => setPaletteOpen(true)}
				aria-keyshortcuts="Meta+K Control+K"
				className="lg:hidden"
			/>
		</>
	);
}

export type AppHeaderProps = {
	/**
	 * The signed-in account, on a page that shows real data (the account page). The header then names
	 * that account, and leaves out the sample organization's switchers and role, which are not the
	 * reader's (D24).
	 */
	account?: HeaderAccount;
};

/**
 * The workspace header (system-10, project-01): the brand and the organization and project switchers on
 * the left; the Preview data marker, search, the reader's role and the account menu on the right. It
 * scrolls away with the page. The organization and project come from the address. The marker shows only
 * on pages that read sample data.
 */
export function AppHeader({ account }: AppHeaderProps = {}) {
	const params = useParams<{ org?: string; project?: string }>();
	const pathname = usePathname();
	const { role } = usePreview();
	const sample = showsSampleData(scopeOf(pathname));
	const org = params.org && getOrg(params.org) ? params.org : DEFAULT_ORG;
	const project = params.project && getProject(org, params.project) ? params.project : undefined;
	const brandHref = account ? "/account" : orgHref(org);

	return (
		<header className="mx-auto w-full max-w-page px-4 md:px-gutter">
			<div className="flex min-h-header flex-wrap items-center gap-x-3 gap-y-2 py-3 md:flex-nowrap md:py-0">
				{/* The wordmark needs the room the two switchers take below 1024 px. */}
				<span className={account ? "sm:hidden" : "lg:hidden"}>
					<Brand href={brandHref} markOnly />
				</span>
				<span className={account ? "hidden sm:inline-flex" : "hidden lg:inline-flex"}>
					<Brand href={brandHref} />
				</span>

				{!account && (
					<>
						<MergedSwitcher org={org} project={project} className="md:hidden" />
						<div className="hidden min-w-0 items-center gap-3 md:flex">
							<OrgSwitcher org={org} />
							{project && (
								<>
									<span aria-hidden="true" className="type-lead text-ink-2">
										/
									</span>
									<ProjectSwitcher org={org} project={project} />
								</>
							)}
						</div>
					</>
				)}

				<div className="ml-auto flex shrink-0 items-center gap-3 lg:gap-2 xl:gap-3">
					{sample && (
						<span className="hidden md:inline-flex">
							<PreviewMarker />
						</span>
					)}
					<SearchControl />
					{!account && <RoleLabel className="hidden lg:inline">{stateOf("role", role).label}</RoleLabel>}
					<AccountMenu account={account} />
				</div>

				{/* On phones the marker takes its own line under the brand, so nothing in the row is cut. */}
				{sample && (
					<div className="w-full md:hidden">
						<PreviewMarker />
					</div>
				)}
			</div>
		</header>
	);
}
