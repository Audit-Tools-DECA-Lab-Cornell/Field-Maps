import type { FormSummary, RawDefinition } from "@/lib/api/types";
import { readDefinition } from "@/lib/observations/answers";

/**
 * Which form version a new map package is prepared for. A package names one published form version: the
 * form observers collect with on that site. Only published versions are offered.
 */

export type PublishedVersion = {
	/** "workspace-check-v1". */
	code: string;
	formName: string;
	version: number;
	publishedAt: string | null;
};

/** Every published version of every form, the most recently published first. */
export function publishedVersions(forms: readonly FormSummary[]): PublishedVersion[] {
	return forms
		.flatMap(form =>
			form.versions
				.filter(version => version.state === "published")
				.map(version => ({
					code: version.code,
					formName: form.name,
					version: version.version,
					publishedAt: version.published_at ?? null
				}))
		)
		.sort(
			(a, b) =>
				(b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") ||
				b.version - a.version ||
				a.code.localeCompare(b.code)
		);
}

/** The acts that describe a zone rather than a play event (the collector's `isInventoryForm`). */
const ZONE_ACTS = new Set(["Climate", "Inventory"]);
const SHARED_ACTS = new Set(["Record"]);

/**
 * Whether a form records a zone's inventory: it asks about the zone's climate or loose parts and nothing
 * about a play event. A package is prepared for the play form, not for this one.
 */
export function isInventoryDefinition(definition: RawDefinition | unknown): boolean {
	const acts = readDefinition(definition).questions.map(question => question.act ?? "");
	return acts.some(act => ZONE_ACTS.has(act)) && acts.every(act => ZONE_ACTS.has(act) || SHARED_ACTS.has(act));
}

/**
 * The form version the upload starts on: the site's current package's, while it is still published;
 * otherwise the newest published one that is not an inventory form (or the newest published, when every
 * one is). `inventory` holds the codes known to be inventory forms. Null when nothing is published.
 */
export function chooseFormVersion(
	published: readonly PublishedVersion[],
	currentFormVersion: string | null,
	inventory: ReadonlySet<string> = new Set()
): string | null {
	if (currentFormVersion && published.some(version => version.code === currentFormVersion)) return currentFormVersion;
	return (published.find(version => !inventory.has(version.code)) ?? published[0])?.code ?? null;
}
