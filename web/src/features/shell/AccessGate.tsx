"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";

import { ORG_SECTIONS, orgHref, PROJECT_SECTIONS } from "./navigation";
import { usePreview } from "./PreviewProvider";

/**
 * Keeps a previewed role out of the pages it cannot open, as the database would (D12): an Observer is sent
 * to the collect handoff from any project page; a Viewer, or anyone below admin on the organization's
 * settings, gets the no-access state while the header and tabs stay.
 */
export function AccessGate({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { role, can, scope } = usePreview();
	const toCollect = scope.kind === "project" && role === "observer";

	useEffect(() => {
		if (toCollect) router.replace(orgHref(scope.org, "collect"));
	}, [router, scope.org, toCollect, pathname]);

	if (toCollect) return null;

	const sections = scope.kind === "project" ? PROJECT_SECTIONS : scope.kind === "org" ? ORG_SECTIONS : [];
	const section = sections.find(entry => entry.segment === scope.section);
	if (!section?.requires || can(section.requires)) return children;

	return (
		<div className="flex flex-col gap-8">
			<PageHeader title={section.pageName} />
			<Island flush>
				<ScreenState
					kind="no-access"
					headingLevel={2}
					actions={
						<ButtonLink href={orgHref(scope.org)} variant="ink" icon="arrow-left">
							Return to projects
						</ButtonLink>
					}
				/>
			</Island>
		</div>
	);
}
