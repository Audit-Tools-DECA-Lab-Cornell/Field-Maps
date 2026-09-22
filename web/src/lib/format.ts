import { SITE_TIME_ZONE } from "@/data/project";

/**
 * Dates and numbers render through `Intl`, pinned to the site's own time zone. Pinning it is what
 * keeps a server render and a browser render identical, and it is also the honest reading: a round
 * happened at ten in the morning where the observer was standing, not where the manager is sitting.
 */

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
	timeZone: SITE_TIME_ZONE,
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false
});

const DATE = new Intl.DateTimeFormat("en-GB", {
	timeZone: SITE_TIME_ZONE,
	day: "numeric",
	month: "short",
	year: "numeric"
});

const TIME = new Intl.DateTimeFormat("en-GB", {
	timeZone: SITE_TIME_ZONE,
	hour: "2-digit",
	minute: "2-digit",
	hour12: false
});

const NUMBER = new Intl.NumberFormat("en-GB");

export function formatDateTime(value: string): string {
	return DATE_TIME.format(new Date(value));
}

export function formatDate(value: string): string {
	return DATE.format(new Date(value));
}

export function formatTime(value: string): string {
	return TIME.format(new Date(value));
}

export function formatCount(value: number): string {
	return NUMBER.format(value);
}

/** “1 record” / “4 records”, without the parenthesised plural that reads badly aloud. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;
}
