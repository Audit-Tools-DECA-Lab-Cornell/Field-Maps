"use client";

import { Icon } from "@/components/contour/Icon";
import { IconButton } from "@/components/contour/IconButton";
import { ShortcutHint } from "@/components/contour/Kbd";
import { RoleLabel } from "@/components/contour/RoleLabel";
import { useShell } from "@/features/shell/ShellProvider";
import { useWorkspace } from "@/features/shell/WorkspaceProvider";
import { stateOf } from "@/lib/contour";
import { cx } from "@/lib/cx";

import { AccountMenu } from "./AccountMenu";
import { Brand } from "./Brand";
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

/**
 * The workspace header (system-10, project-01): the brand and the organization and project switchers on
 * the left; search, the person's role here and the account menu on the right. It scrolls away with the
 * page. The organization and project come from the address, checked against the person's memberships
 * (`useWorkspace()`); outside an organization (the account page) there are no switchers and no role.
 */
export function AppHeader() {
	const { org, project } = useWorkspace();
	const role = project?.role ?? org?.role;

	return (
		<header className="mx-auto w-full max-w-page px-4 md:px-gutter">
			<div className="flex min-h-header flex-wrap items-center gap-x-3 gap-y-2 py-3 md:flex-nowrap md:py-0">
				{/* The wordmark needs the room the two switchers take below 1024 px. */}
				<span className={org ? "lg:hidden" : "sm:hidden"}>
					<Brand href="/o" markOnly />
				</span>
				<span className={org ? "hidden lg:inline-flex" : "hidden sm:inline-flex"}>
					<Brand href="/o" />
				</span>

				{org && (
					<>
						<MergedSwitcher className="md:hidden" />
						<div className="hidden min-w-0 items-center gap-3 md:flex">
							<OrgSwitcher />
							{project && (
								<>
									<span aria-hidden="true" className="type-lead text-ink-2">
										/
									</span>
									<ProjectSwitcher />
								</>
							)}
						</div>
					</>
				)}

				<div className="ml-auto flex shrink-0 items-center gap-3 lg:gap-2 xl:gap-3">
					<SearchControl />
					{role && <RoleLabel className="hidden lg:inline">{stateOf("role", role).label}</RoleLabel>}
					<AccountMenu />
				</div>
			</div>
		</header>
	);
}
