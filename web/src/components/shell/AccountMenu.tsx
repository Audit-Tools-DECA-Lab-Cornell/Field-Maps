"use client";

import { useRef } from "react";

import { Avatar } from "@/components/contour/Avatar";
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSeparator,
	MenuTrigger
} from "@/components/contour/Menu";
import { orgHref, projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { useShell } from "@/features/shell/ShellProvider";
import { getOrg, getProject, VIEWER } from "@/fixtures";
import { stateOf, type ThemeName } from "@/lib/contour";
import { useTheme } from "@/lib/theme";

import { useNavigatingMenu } from "./Switchers";

/**
 * The account button (the header's last item) and its menu: who is signed in and in what role, the
 * settings the role reaches, the screen theme, the shortcuts and Sign out.
 */
export function AccountMenu() {
	const menu = useNavigatingMenu();
	const shortcutsPending = useRef(false);
	const { role, can, canOrg, scope } = usePreview();
	const { setShortcutsOpen } = useShell();
	const [theme, setTheme] = useTheme();
	const place = scope.project ? getProject(scope.org, scope.project)?.name : (getOrg(scope.org)?.name ?? scope.org);

	return (
		<Menu>
			<MenuTrigger
				aria-label={`Account, ${VIEWER.name}`}
				className="shrink-0 rounded-pill transition-opacity duration-(--ct-duration-quick) ease-standard hover:opacity-90">
				<Avatar initials={VIEWER.initials} tone="ink" size="lg" />
			</MenuTrigger>
			<MenuContent
				align="end"
				className="w-72"
				onCloseAutoFocus={event => {
					menu.onCloseAutoFocus(event);
					// Open the shortcuts once focus is back on the account button, so it returns there after.
					if (!shortcutsPending.current) return;
					shortcutsPending.current = false;
					window.setTimeout(() => setShortcutsOpen(true), 0);
				}}>
				<div className="flex items-start gap-3 px-3 pt-2 pb-3">
					<Avatar initials={VIEWER.initials} tone="ink" size="md" />
					<div className="min-w-0">
						<p className="type-body font-semibold">{VIEWER.name}</p>
						<p className="type-small text-ink-2 wrap-anywhere">{VIEWER.email}</p>
						<p className="mt-1 type-small text-ink-2">
							<span className="type-mono-label">{stateOf("role", role).label}</span> · {place}
						</p>
					</div>
				</div>
				<MenuSeparator />
				<MenuItem icon="user" href="/account" onSelect={menu.markNavigating}>
					Account
				</MenuItem>
				{canOrg("viewOrgSettings") && (
					<MenuItem icon="building-2" href={orgHref(scope.org, "settings")} onSelect={menu.markNavigating}>
						Organization settings
					</MenuItem>
				)}
				{scope.kind === "project" && scope.project && can("viewProjectSettings") && (
					<MenuItem
						icon="settings"
						href={projectHref(scope.org, scope.project, "settings")}
						onSelect={menu.markNavigating}>
						Project settings
					</MenuItem>
				)}
				<MenuSeparator />
				<MenuLabel>Screen</MenuLabel>
				<MenuRadioGroup value={theme} onValueChange={value => setTheme(value as ThemeName)}>
					<MenuRadioItem value="day" icon="sun">
						Day
					</MenuRadioItem>
					<MenuRadioItem value="dusk" icon="moon">
						Dusk
					</MenuRadioItem>
				</MenuRadioGroup>
				<MenuSeparator />
				<MenuItem
					icon="circle-help"
					shortcut="?"
					onSelect={() => {
						shortcutsPending.current = true;
					}}>
					Keyboard shortcuts
				</MenuItem>
				<MenuSeparator />
				<MenuItem icon="log-out" href="/sign-in" onSelect={menu.markNavigating}>
					Sign out
				</MenuItem>
			</MenuContent>
		</Menu>
	);
}
