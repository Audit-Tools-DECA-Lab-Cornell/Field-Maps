"use client";

import { InkTabs } from "@/components/contour/InkTabs";
import { ORG_SECTIONS, orgHref, PROJECT_SECTIONS, projectHref, type Section } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";

function useVisible(sections: Section[]): Section[] {
	const { can } = usePreview();
	return sections.filter(section => !section.requires || can(section.requires));
}

/** Overview · Data · Sites · Forms · Team · QGIS · Reports · Settings. A Viewer has no Team or Settings. */
export function ProjectTabs({ org, project }: { org: string; project: string }) {
	const items = useVisible(PROJECT_SECTIONS).map(section => ({
		href: projectHref(org, project, section.segment),
		label: section.label
	}));
	return <InkTabs items={items} label="Project" />;
}

/** Projects · Members · Form library · Settings. Settings is for owners and admins. */
export function OrgTabs({ org }: { org: string }) {
	const items = useVisible(ORG_SECTIONS).map(section => ({
		href: orgHref(org, section.segment),
		label: section.label
	}));
	return <InkTabs items={items} label="Organization" />;
}
