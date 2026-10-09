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
import { useShell } from "@/features/shell/ShellProvider";
import { useWorkspace } from "@/features/shell/WorkspaceProvider";
import { signOut } from "@/lib/auth/actions";
import { stateOf, type ThemeName } from "@/lib/contour";
import { supabaseConfig } from "@/lib/supabase/config";
import { useTheme } from "@/lib/theme";

import { useNavigatingMenu } from "./Switchers";

/**
 * The account button (the header's last item) and its menu: who is signed in (name, email and initials
 * from their profile and sign-in), their role in the organization or project on screen, the settings that
 * role reaches, the screen theme, the shortcuts and Sign out.
 *
 * Sign out submits a form to the `signOut` Server Action, which ends the Supabase sign-in and lands on the
 * sign-in page. A build without Supabase has nobody signed in, so there it simply leads to sign in.
 */
export function AccountMenu() {
	const menu = useNavigatingMenu();
	const shortcutsPending = useRef(false);
	const signOutForm = useRef<HTMLFormElement>(null);
	const { account: person, org, project, orgAbilities, projectAbilities } = useWorkspace();
	const { setShortcutsOpen } = useShell();
	const [theme, setTheme] = useTheme();
	const role = project?.role ?? org?.role;
	const place = project?.name ?? org?.name;
	const signedIn = supabaseConfig() !== null;

	return (
		<>
			{signedIn && <form ref={signOutForm} action={signOut} hidden />}
			<Menu>
				<MenuTrigger
					aria-label={`Account, ${person.name}`}
					className="shrink-0 rounded-pill transition-opacity duration-(--ct-duration-quick) ease-standard hover:opacity-90">
					<Avatar initials={person.initials} tone="ink" size="lg" />
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
						<Avatar initials={person.initials} tone="ink" size="md" />
						<div className="min-w-0">
							<p className="type-body font-semibold wrap-anywhere">{person.name}</p>
							{person.email && person.email !== person.name && (
								<p className="type-small text-ink-2 wrap-anywhere">{person.email}</p>
							)}
							{role && place && (
								<p className="mt-1 type-small text-ink-2">
									<span className="type-mono-label">{stateOf("role", role).label}</span> · {place}
								</p>
							)}
						</div>
					</div>
					<MenuSeparator />
					<MenuItem icon="user" href="/account" onSelect={menu.markNavigating}>
						Account
					</MenuItem>
					{org && orgAbilities.manage && (
						<MenuItem icon="building-2" href={orgHref(org.slug, "settings")} onSelect={menu.markNavigating}>
							Organization settings
						</MenuItem>
					)}
					{org && project && projectAbilities.manage && (
						<MenuItem
							icon="settings"
							href={projectHref(org.slug, project.code, "settings")}
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
					{signedIn ? (
						<MenuItem
							icon="log-out"
							onSelect={() => {
								menu.markNavigating();
								signOutForm.current?.requestSubmit();
							}}>
							Sign out
						</MenuItem>
					) : (
						<MenuItem icon="log-out" href="/sign-in" onSelect={menu.markNavigating}>
							Sign out
						</MenuItem>
					)}
				</MenuContent>
			</Menu>
		</>
	);
}
