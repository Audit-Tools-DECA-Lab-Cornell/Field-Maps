"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { ScreenState } from "@/components/contour/ScreenState";
import { isNoAccess } from "@/lib/workspace/result";
import type { Failure } from "@/lib/workspace/types";

export type LoadFailureProps = {
	/** Why the read failed, from `settle()`. */
	failure: Failure;
	/** What could not load, as it reads after "Couldn't load": "the team", "this site". */
	what: string;
	/**
	 * What a person without access is told, when the page is for some roles only: "Only project managers
	 * can open the team." Without it the failure's own words are shown.
	 */
	noAccess?: string;
	/** Inside an island that already has a title: show the state only, without an island of its own. */
	bare?: boolean;
	className?: string;
};

/**
 * A read that failed, as the person can act on it (DESIGN §7):
 * - signed out → "You were signed out." and Sign in again, coming back to this page;
 * - no access → the page's own no-access sentence;
 * - anything else → "Couldn't load <what>." with the reason and Try again.
 * A failed read is never shown as an empty list.
 */
export function LoadFailure({ failure, what, noAccess, bare = false, className }: LoadFailureProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [retrying, startRetry] = useTransition();

	let state;
	if (failure.kind === "sign-in") {
		state = (
			<ScreenState
				kind="no-access"
				icon="log-in"
				title="You were signed out."
				body="Sign in again to continue where you were."
				actions={
					<ButtonLink variant="primary" href={`/sign-in?next=${encodeURIComponent(pathname || "/o")}`}>
						Sign in again
					</ButtonLink>
				}
			/>
		);
	} else if (isNoAccess(failure)) {
		state = (
			<ScreenState
				kind="no-access"
				title={noAccess ?? "You do not have access to this page."}
				body={failure.message}
			/>
		);
	} else {
		state = (
			<ScreenState
				kind="error"
				title={`Couldn't load ${what}.`}
				body={failure.message}
				actions={
					<Button
						variant="outline"
						icon="rotate-cw"
						busy={retrying}
						busyLabel="Trying again…"
						onClick={() => startRetry(() => router.refresh())}>
						Try again
					</Button>
				}
			/>
		);
	}

	if (bare) return <div className={className}>{state}</div>;
	return (
		<Island flush divided={false} className={className}>
			{state}
		</Island>
	);
}
