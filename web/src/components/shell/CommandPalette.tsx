"use client";

import { Command } from "cmdk";
import { useParams, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState } from "react";

import { Icon } from "@/components/contour/Icon";
import { Kbd } from "@/components/contour/Kbd";
import { projectHref } from "@/features/shell/navigation";
import {
	type PaletteEntry,
	type PaletteGroup,
	placeGroups,
	readRecent,
	rememberRecent
} from "@/features/shell/palette";
import { usePreview } from "@/features/shell/PreviewProvider";
import { useShell } from "@/features/shell/ShellProvider";
import { DEFAULT_ORG, DEFAULT_PROJECT, getOrg, getProject } from "@/fixtures";
import { cx } from "@/lib/cx";
import { useMapPalette } from "@/lib/map-palette-store";
import { useTheme } from "@/lib/theme";

const GROUP = cx(
	"[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1",
	"[&_[cmdk-group-heading]]:type-mono-label [&_[cmdk-group-heading]]:text-ink-2"
);

const ITEM = cx(
	"flex min-h-touch cursor-pointer items-center gap-3 rounded-input px-3 py-2 type-body text-ink select-none",
	"data-[selected=true]:bg-well",
	"transition-[background-color] duration-(--ct-duration-quick) ease-standard"
);

type ActionEntry = PaletteEntry & { run: () => void };

function EntryRow({ entry }: { entry: PaletteEntry }) {
	return (
		<>
			<Icon name={entry.icon} size={18} className="shrink-0 text-ink-2" />
			<span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
				<span className={entry.labelMono ? "type-mono-data font-semibold" : "font-semibold"}>
					{entry.label}
				</span>
				{entry.meta && (
					<span className={cx("text-ink-2", entry.metaMono ? "type-mono-data" : "type-small")}>
						{entry.meta}
					</span>
				)}
			</span>
			{entry.shortcut && (
				<span className="flex shrink-0 items-center gap-1" aria-hidden="true">
					{entry.shortcut.map(key => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</span>
			)}
		</>
	);
}

/** The palette's contents. Mounted only while open, so the recent list is read fresh each time. */
function PaletteBody({ onNavigate, onClose }: { onNavigate: (href: string) => void; onClose: () => void }) {
	const params = useParams<{ org?: string; project?: string }>();
	const { can, canOrg } = usePreview();
	const { setShortcutsOpen } = useShell();
	const [theme, setTheme] = useTheme();
	const [mapPalette, setMapPalette] = useMapPalette();
	const [query, setQuery] = useState("");
	const [recent] = useState(readRecent);

	const org = params.org && getOrg(params.org) ? params.org : DEFAULT_ORG;
	const project = params.project && getProject(org, params.project) ? params.project : undefined;
	const searchProject = project ?? DEFAULT_PROJECT;
	const orgName = getOrg(org)?.name ?? org;
	const groups: PaletteGroup[] = placeGroups({ org, orgName, project, searchProject, can, canOrg }, query);

	const actions: ActionEntry[] = [];
	const base = projectHref(org, searchProject);
	const go = (href: string) => () => onNavigate(href);
	if (can("export"))
		actions.push({
			id: "action-export",
			label: "Export current scope",
			icon: "download",
			href: `${base}/data?export=1`,
			run: go(`${base}/data?export=1`)
		});
	if (can("inviteMembers"))
		actions.push({
			id: "action-invite",
			label: "Invite member",
			icon: "plus",
			href: `${base}/team?invite=1`,
			run: go(`${base}/team?invite=1`)
		});
	if (can("uploadPackage"))
		actions.push({
			id: "action-upload",
			label: "Upload package",
			meta: "Riverside",
			icon: "upload",
			href: `${base}/sites/riverside/packages?step=upload`,
			run: go(`${base}/sites/riverside/packages?step=upload`)
		});
	actions.push(
		theme === "dusk"
			? { id: "action-day", label: "Switch to Day", meta: "Screen", icon: "sun", run: () => setTheme("day") }
			: { id: "action-dusk", label: "Switch to Dusk", meta: "Screen", icon: "moon", run: () => setTheme("dusk") },
		mapPalette === "night"
			? { id: "action-map-day", label: "Map palette: Day", icon: "map", run: () => setMapPalette("day") }
			: { id: "action-map-night", label: "Map palette: Night", icon: "map", run: () => setMapPalette("night") },
		{
			id: "action-shortcuts",
			label: "Keyboard shortcuts",
			icon: "circle-help",
			shortcut: ["?"],
			run: () => {
				onClose();
				// Once focus is back on what opened the palette, so closing the shortcuts returns there.
				window.setTimeout(() => setShortcutsOpen(true), 20);
			}
		}
	);

	function open(entry: PaletteEntry) {
		if (!entry.href) return;
		rememberRecent(entry);
		onNavigate(entry.href);
	}

	return (
		<Command label="Search or jump to" loop className="flex max-h-[min(36rem,75dvh)] flex-col">
			<div className="flex items-center gap-3 border-b border-rule px-5">
				<Icon name="search" size={20} className="shrink-0 text-ink" />
				<Command.Input
					value={query}
					onValueChange={setQuery}
					placeholder="Search or jump to…"
					className="h-14 min-w-0 flex-1 bg-transparent type-body text-ink placeholder:text-ink-2 [--ct-size-focus-ring:0px]"
				/>
			</div>
			<Command.List className="min-h-0 flex-1 overflow-y-auto p-2">
				<Command.Empty className="px-3 py-6 type-body text-ink-2">
					No matches for “{query}”. Try an observation ID like{" "}
					<span className="type-mono-data">OBS-0244</span>, a site, or a person.
				</Command.Empty>
				{recent.length > 0 && !query && (
					<Command.Group heading="Recent" className={GROUP}>
						{recent.map(entry => (
							<Command.Item
								key={`recent-${entry.href}`}
								value={`recent ${entry.label} ${entry.href}`}
								onSelect={() => entry.href && onNavigate(entry.href)}
								className={ITEM}>
								<EntryRow entry={{ ...entry, id: entry.href ?? entry.label }} />
							</Command.Item>
						))}
					</Command.Group>
				)}
				{groups.map(group => (
					<Command.Group key={group.heading} heading={group.heading} className={GROUP}>
						{group.entries.map(entry => (
							<Command.Item
								key={entry.id}
								value={`${entry.id} ${entry.label}`}
								keywords={[entry.label, entry.meta ?? "", ...(entry.keywords ?? [])]}
								onSelect={() => open(entry)}
								className={ITEM}>
								<EntryRow entry={entry} />
							</Command.Item>
						))}
					</Command.Group>
				))}
				<Command.Group heading="Actions" className={GROUP}>
					{actions.map(entry => (
						<Command.Item
							key={entry.id}
							value={`${entry.id} ${entry.label}`}
							keywords={[entry.label, entry.meta ?? ""]}
							onSelect={() => {
								if (entry.href) rememberRecent(entry);
								entry.run();
								if (!entry.href && entry.id !== "action-shortcuts") onClose();
							}}
							className={ITEM}>
							<EntryRow entry={entry} />
						</Command.Item>
					))}
				</Command.Group>
			</Command.List>
			<p className="border-t border-rule px-5 py-3 type-small text-ink-2">
				↑↓ to move · ↵ to open · esc to close
			</p>
		</Command>
	);
}

/**
 * "Search or jump to" (DESIGN §5, §8): ⌘K or Ctrl K anywhere, or the header's search pill. It jumps to
 * tabs, projects, sites, zones, form versions, people and OBS- IDs, and runs a few actions. Mounted once,
 * in the workspace layout.
 */
export function CommandPalette() {
	const router = useRouter();
	const { paletteOpen, setPaletteOpen } = useShell();
	const navigated = useRef(false);

	function navigate(href: string) {
		navigated.current = true;
		setPaletteOpen(false, { restoreFocus: false });
		router.push(href);
	}

	return (
		<DialogPrimitive.Root open={paletteOpen} onOpenChange={open => setPaletteOpen(open)}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					onCloseAutoFocus={event => {
						// After a jump, focus belongs to the new page's title (RouteFocus), not the trigger.
						if (!navigated.current) return;
						navigated.current = false;
						event.preventDefault();
					}}
					className={cx(
						"fixed inset-x-0 top-[15vh] z-50 mx-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden",
						"rounded-island border border-line bg-island text-ink shadow-ledge",
						"data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
					)}>
					<DialogPrimitive.Title className="sr-only">Search or jump to</DialogPrimitive.Title>
					<PaletteBody onNavigate={navigate} onClose={() => setPaletteOpen(false)} />
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
