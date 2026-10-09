"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useCallback, useEffect, useMemo } from "react";

import { ORG_MEMBERSHIPS, VIEWER_ID } from "@/fixtures";
import {
	applyPreviewParams,
	can as roleCan,
	type PreviewAction,
	type PreviewRole,
	type PreviewScreenState,
	previewStore
} from "@/lib/preview";

import { type Scope, scopeOf } from "./navigation";
import { useSessionStore } from "./useSessionStore";

/**
 * Temporary: the screens not yet moved to live data still read their role from here. The shell no longer
 * does (it reads `useWorkspace()`); this file goes when the last of those screens does.
 */
function defaultRoleFor(scope: Scope): PreviewRole {
	if (scope.kind === "collect") return "observer";
	// An admin acts as a manager on every project in the organization (PRODUCT.md § Roles).
	if (scope.kind === "project") return "manager";
	const membership = ORG_MEMBERSHIPS.find(entry => entry.personId === VIEWER_ID && entry.orgSlug === scope.org);
	return membership?.role === "owner" ? "owner" : "admin";
}

/** Takes `?as=` and `?preview-state=` from the address whenever it changes. */
function PreviewUrlSync() {
	const searchParams = useSearchParams();
	useEffect(() => {
		applyPreviewParams(searchParams);
	}, [searchParams]);
	return null;
}

/**
 * The preview honesty layer for the workspace (D20). The values themselves live in a session store, so
 * this provider only listens to the address; `usePreview` reads the store anywhere below it.
 */
export function PreviewProvider({ children }: { children: ReactNode }) {
	return (
		<>
			<Suspense fallback={null}>
				<PreviewUrlSync />
			</Suspense>
			{children}
		</>
	);
}

export type Preview = {
	/** Who the reader is viewing as: their own role for the page unless "View as" changed it. */
	role: PreviewRole;
	/** The reader's own role for the page, before any preview. */
	ownRole: PreviewRole;
	/** True while "View as" shows another role. */
	roleOverridden: boolean;
	setRole: (role: PreviewRole | null) => void;
	/** The state every data island shows (DESIGN §7). "normal" shows the content. */
	screenState: PreviewScreenState;
	setScreenState: (state: PreviewScreenState) => void;
	/** Back to the reader's own role and the normal state. */
	reset: () => void;
	/** The offline preview: content stays, changing actions are disabled with their reason. */
	offline: boolean;
	can: (action: PreviewAction) => boolean;
	/**
	 * The reader's organization role: on a project page the page role is Manager, but an admin is still an
	 * admin of the organization. A previewed Owner or Admin keeps that role; any other previewed role is a member.
	 */
	orgRole: PreviewRole | "member";
	/** `can` for organization actions (Create project, Organization settings), by the organization role. */
	canOrg: (action: PreviewAction) => boolean;
	scope: Scope;
};

/** The preview role and screen state for the page on screen. */
export function usePreview(): Preview {
	const pathname = usePathname();
	const overrides = useSessionStore(previewStore);
	const scope = useMemo(() => scopeOf(pathname), [pathname]);
	const ownRole = defaultRoleFor(scope);
	const role = overrides.role ?? ownRole;

	const setRole = useCallback((next: PreviewRole | null) => {
		previewStore.set(current => ({ ...current, role: next }));
	}, []);
	const setScreenState = useCallback((next: PreviewScreenState) => {
		previewStore.set(current => ({ ...current, screenState: next }));
	}, []);
	const reset = useCallback(() => previewStore.reset(), []);
	const can = useCallback((action: PreviewAction) => roleCan(role, action), [role]);
	const ownOrgRole = defaultRoleFor({ ...scope, kind: "org" });
	const orgRole: PreviewRole | "member" =
		overrides.role === null
			? ownOrgRole
			: overrides.role === "owner" || overrides.role === "admin"
				? overrides.role
				: "member";
	const canOrg = useCallback((action: PreviewAction) => orgRole !== "member" && roleCan(orgRole, action), [orgRole]);

	return {
		role,
		ownRole,
		roleOverridden: overrides.role !== null && overrides.role !== ownRole,
		setRole,
		screenState: overrides.screenState,
		setScreenState,
		reset,
		offline: overrides.screenState === "offline",
		can,
		orgRole,
		canOrg,
		scope
	};
}
