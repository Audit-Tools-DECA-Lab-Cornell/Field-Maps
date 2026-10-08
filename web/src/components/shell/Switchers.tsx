"use client";

import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";

import { Icon } from "@/components/contour/Icon";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/contour/Menu";
import { StateBadge } from "@/components/contour/StateBadge";
import { orgHref, projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { getOrg, ORGANIZATIONS, type Project, projectsIn } from "@/fixtures";
import { stateOf } from "@/lib/contour";
import { cx } from "@/lib/cx";

/** The header pill that opens a switcher: island fill, fine edge, the name at 600 and a chevron. */
const PILL = cx(
	"inline-flex h-control max-w-full shrink-0 items-center gap-2 rounded-pill border border-line bg-island px-4 type-body font-semibold text-ink",
	"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-well data-[state=open]:bg-well"
);

/**
 * A menu item that navigates closes the menu before the page changes. Radix would then hand focus back to
 * the trigger, after the route's own focus has moved to the new title; this keeps the route's focus.
 */
export function useNavigatingMenu() {
	const navigated = useRef(false);
	return {
		markNavigating: () => {
			navigated.current = true;
		},
		onCloseAutoFocus: (event: Event) => {
			if (!navigated.current) return;
			navigated.current = false;
			event.preventDefault();
		}
	};
}

function Check({ on }: { on: boolean }) {
	if (!on) return null;
	return (
		<>
			<Icon name="check" size={18} className="shrink-0" />
			<span className="sr-only">, current</span>
		</>
	);
}

function OrgItems({ current, onNavigate }: { current: string; onNavigate: () => void }) {
	const { orgRole } = usePreview();
	const roleWord = stateOf("role", orgRole).label;
	return (
		<>
			<MenuLabel>Organizations</MenuLabel>
			{ORGANIZATIONS.map(org => (
				<MenuItem key={org.slug} icon="building-2" href={orgHref(org.slug)} onSelect={onNavigate}>
					<span className="flex items-center gap-3">
						<span className="min-w-0 flex-1 font-semibold">{org.name}</span>
						<span className="type-mono-label text-ink-2">{roleWord}</span>
						<Check on={org.slug === current} />
					</span>
				</MenuItem>
			))}
		</>
	);
}

function ProjectItem({
	org,
	project,
	current,
	onNavigate
}: {
	org: string;
	project: Project;
	current: boolean;
	onNavigate: () => void;
}) {
	const { role } = usePreview();
	const roleWord = project.state === "practice" ? "Everyone" : stateOf("role", role).label;
	return (
		<MenuItem href={projectHref(org, project.slug)} onSelect={onNavigate}>
			<span className="flex items-center gap-3">
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="font-semibold">{project.name}</span>
					<span className="flex flex-wrap items-baseline gap-x-2 type-small text-ink-2">
						<StateBadge kind="project" state={project.state} size="sm" />
						<span aria-hidden="true">·</span>
						<span>{roleWord}</span>
					</span>
				</span>
				<Check on={current} />
			</span>
		</MenuItem>
	);
}

function TailItems({ org, onNavigate }: { org: string; onNavigate: () => void }) {
	const { canOrg } = usePreview();
	return (
		<>
			<MenuSeparator />
			<MenuItem icon="folder" href={orgHref(org)} onSelect={onNavigate}>
				All projects
			</MenuItem>
			{canOrg("createProject") && (
				<MenuItem icon="plus" href="/onboarding/project" onSelect={onNavigate}>
					Create project
				</MenuItem>
			)}
		</>
	);
}

/**
 * Typing narrows the project list; ↓ moves into it. Character keys stay in the field, so the menu's own
 * typeahead does not take focus away mid-word.
 */
function ProjectFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			const menu = event.currentTarget.closest("[role='menu']");
			menu?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
			return;
		}
		if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
	}
	return (
		<div className="px-1.5 pt-1.5 pb-1">
			<label className="relative block">
				<span className="sr-only">Filter projects</span>
				<Icon
					name="search"
					size={16}
					className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2"
				/>
				<input
					// The filter takes focus when the menu opens, so typing narrows the list at once.
					autoFocus
					type="text"
					value={value}
					onChange={event => onChange(event.target.value)}
					onKeyDown={onKeyDown}
					placeholder="Filter projects"
					autoComplete="off"
					className="h-10 w-full rounded-input border border-line bg-island pr-3 pl-9 type-small text-ink placeholder:text-ink-2"
				/>
			</label>
		</div>
	);
}

function useProjectFilter(org: string) {
	const [query, setQuery] = useState("");
	const projects = projectsIn(org);
	const needle = query.trim().toLowerCase();
	const shown = needle ? projects.filter(project => project.name.toLowerCase().includes(needle)) : projects;
	return { query, setQuery, shown };
}

function ProjectList({
	org,
	current,
	shown,
	onNavigate
}: {
	org: string;
	current?: string;
	shown: Project[];
	onNavigate: () => void;
}) {
	const orgName = getOrg(org)?.name ?? org;
	return (
		<>
			<MenuLabel>Projects in {orgName}</MenuLabel>
			{shown.length === 0 ? (
				<p className="px-3 py-2 type-small text-ink-2">No project has that name.</p>
			) : (
				shown.map(project => (
					<ProjectItem
						key={project.slug}
						org={org}
						project={project}
						current={project.slug === current}
						onNavigate={onNavigate}
					/>
				))
			)}
		</>
	);
}

function SwitcherPill({ children, label }: { children: ReactNode; label: string }) {
	return (
		<MenuTrigger className={PILL} aria-label={label}>
			<span className="whitespace-nowrap">{children}</span>
			<Icon name="chevron-down" size={18} className="shrink-0" />
		</MenuTrigger>
	);
}

/** "DECA Lab ⌄": the organizations the reader belongs to, then All projects and Create project. */
export function OrgSwitcher({ org, className }: { org: string; className?: string }) {
	const menu = useNavigatingMenu();
	const name = getOrg(org)?.name ?? org;
	return (
		<div className={className}>
			<Menu>
				<SwitcherPill label={`Organization: ${name}`}>{name}</SwitcherPill>
				<MenuContent align="start" className="w-72" onCloseAutoFocus={menu.onCloseAutoFocus}>
					<OrgItems current={org} onNavigate={menu.markNavigating} />
					<TailItems org={org} onNavigate={menu.markNavigating} />
				</MenuContent>
			</Menu>
		</div>
	);
}

/** "Play Study ⌄": the organization's projects with their state and the reader's role, filtered by typing. */
export function ProjectSwitcher({ org, project, className }: { org: string; project: string; className?: string }) {
	const menu = useNavigatingMenu();
	const filter = useProjectFilter(org);
	const name = projectsIn(org).find(entry => entry.slug === project)?.name ?? project;
	return (
		<div className={className}>
			<Menu onOpenChange={open => !open && filter.setQuery("")}>
				<SwitcherPill label={`Project: ${name}`}>{name}</SwitcherPill>
				<MenuContent align="start" className="w-80" onCloseAutoFocus={menu.onCloseAutoFocus}>
					<ProjectFilter value={filter.query} onChange={filter.setQuery} />
					<ProjectList org={org} current={project} shown={filter.shown} onNavigate={menu.markNavigating} />
					<TailItems org={org} onNavigate={menu.markNavigating} />
				</MenuContent>
			</Menu>
		</div>
	);
}

/** Below 768 px the two switchers merge into one pill: the project's name, or the organization's outside one. */
export function MergedSwitcher({ org, project, className }: { org: string; project?: string; className?: string }) {
	const menu = useNavigatingMenu();
	const filter = useProjectFilter(org);
	const orgName = getOrg(org)?.name ?? org;
	const projectName = project ? projectsIn(org).find(entry => entry.slug === project)?.name : undefined;
	return (
		<div className={cx("min-w-0", className)}>
			<Menu onOpenChange={open => !open && filter.setQuery("")}>
				<SwitcherPill label={projectName ? `${orgName}, project: ${projectName}` : `Organization: ${orgName}`}>
					{projectName ?? orgName}
				</SwitcherPill>
				<MenuContent align="start" className="w-80" onCloseAutoFocus={menu.onCloseAutoFocus}>
					<OrgItems current={org} onNavigate={menu.markNavigating} />
					<MenuSeparator />
					<ProjectFilter value={filter.query} onChange={filter.setQuery} />
					<ProjectList org={org} current={project} shown={filter.shown} onNavigate={menu.markNavigating} />
					<TailItems org={org} onNavigate={menu.markNavigating} />
				</MenuContent>
			</Menu>
		</div>
	);
}
