"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import type { IconName } from "@/components/contour/Icon";
import { ScreenState } from "@/components/contour/ScreenState";
import { formatTime, PREVIEW_NOW } from "@/fixtures";

import { orgHref } from "./navigation";
import { usePreview } from "./PreviewProvider";

type Message = { title?: ReactNode; body?: ReactNode; actions?: ReactNode; icon?: IconName };

export type PreviewStateViewProps = {
	/** The content in the normal state, and under the offline banner. */
	children: ReactNode;
	/** The line under the placeholders: "Loading projects…". */
	loadingLabel?: string;
	rows?: number;
	/** Nothing made yet. Without it, the designed "No map package yet" words show. */
	empty?: Message;
	/** Empty after filtering. */
	filtered?: Message;
	error?: Message;
	noAccess?: Message;
	headingLevel?: 2 | 3 | 4;
};

/**
 * What a data island shows for the preview's screen state (DESIGN §7): its content normally, or the
 * loading, empty, filtered, error, offline or no-access state in its place. Put it inside a flush Island,
 * so the island's header and the page around it stay.
 */
export function PreviewStateView({
	children,
	loadingLabel,
	rows,
	empty,
	filtered,
	error,
	noAccess,
	headingLevel
}: PreviewStateViewProps) {
	const pathname = usePathname();
	const { screenState, setScreenState, scope } = usePreview();
	const projectsHref = orgHref(scope.org);
	const returnToProjects =
		pathname === projectsHref ? null : (
			<ButtonLink href={projectsHref} variant="outline" icon="arrow-left">
				Return to projects
			</ButtonLink>
		);

	switch (screenState) {
		case "loading":
			return <ScreenState kind="loading" loadingLabel={loadingLabel} rows={rows} />;
		case "empty":
			return <ScreenState kind="empty" headingLevel={headingLevel} {...empty} />;
		case "filtered":
			return (
				<ScreenState
					kind="filtered"
					headingLevel={headingLevel}
					actions={
						<Button variant="ink" icon="x" onClick={() => setScreenState("normal")}>
							Clear filters
						</Button>
					}
					{...filtered}
				/>
			);
		case "error":
			return (
				<ScreenState
					kind="error"
					headingLevel={headingLevel}
					actions={
						<>
							<Button variant="ink" icon="rotate-cw" onClick={() => setScreenState("normal")}>
								Try again
							</Button>
							{returnToProjects}
						</>
					}
					{...error}
				/>
			);
		case "offline":
			return (
				<ScreenState
					kind="offline"
					loadedAt={formatTime(PREVIEW_NOW)}
					actions={
						<Button variant="outline" icon="rotate-cw" onClick={() => setScreenState("normal")}>
							Retry connection
						</Button>
					}>
					{children}
				</ScreenState>
			);
		case "no-access":
			return (
				<ScreenState
					kind="no-access"
					headingLevel={headingLevel}
					actions={
						pathname === projectsHref ? undefined : (
							<ButtonLink href={projectsHref} variant="ink" icon="arrow-left">
								Return to projects
							</ButtonLink>
						)
					}
					{...noAccess}
				/>
			);
		default:
			return children;
	}
}
