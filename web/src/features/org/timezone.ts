import { DEFAULT_TIME_ZONE, isTimeZone } from "@/lib/time";

/**
 * The timezone an organization's dates and a new project start with: the first project's, since an
 * organization has none of its own, or New York when it has no project yet (or none with a usable zone).
 */
export function orgTimeZone(projects: readonly { timezone: string }[]): string {
	return projects.find(project => isTimeZone(project.timezone))?.timezone ?? DEFAULT_TIME_ZONE;
}
