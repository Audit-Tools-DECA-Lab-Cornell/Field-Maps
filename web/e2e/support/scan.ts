import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

import { SEED } from "./manifest";

/**
 * The honesty scan: what a researcher sees on a page must be real and in their words. Each check is a
 * soft assertion, so one run reports every problem on the page, and the findings are attached to the
 * test as JSON.
 */

type Banned = { label: string; pattern: RegExp };

/** Sample-workspace leftovers: none of these may appear anywhere, in text, labels or links. */
const SAMPLE: Banned[] = [
	{ label: "sample person p.sudhakar", pattern: /p\.sudhakar/i },
	{ label: "sample address example.org", pattern: /example\.org/i },
	{ label: "sample person Alex Kim", pattern: /Alex Kim/i },
	{ label: "sample workspace /o/deca", pattern: /\/o\/deca(?![\w-])/ },
	{ label: "proposal marker", pattern: /\bProposal\s+[A-Z]+\d+\b/ }
];

/**
 * Inside the local workspace ("Web acceptance lab" / "Play study acceptance") the real study's names can
 * only be hard-coded. The public pages may name the DECA Lab, which runs DECA Mark, so this list applies
 * to signed-in pages only.
 */
const HARD_CODED: Banned[] = [
	// The product is DECA Mark; any other DECA (the lab's own name) is a hard-coded organization.
	{ label: "hard-coded organization DECA", pattern: /\bDECA(?! Mark\b)/ },
	{ label: "hard-coded project Play Study", pattern: /\bPlay Study\b/ }
];

/** Words the copy rules keep off screens (web/AGENTS.md, the build spec's UI copy rules). */
const JARGON: Banned[] = [
	{ label: "preview", pattern: /\bpreviews?\b/i },
	{ label: "fixture", pattern: /\bfixtures?\b/i },
	{ label: "sample", pattern: /\bsamples?\b/i },
	{ label: "demo", pattern: /\bdemo(nstration)?s?\b/i },
	{ label: "API", pattern: /\bAPIs?\b/ },
	{ label: "endpoint", pattern: /\bend-?points?\b/i },
	{ label: "server", pattern: /\bservers?\b/i },
	{ label: "session", pattern: /\bsessions?\b/i },
	{ label: "token", pattern: /\btokens?\b/i },
	{ label: "payload", pattern: /\bpayloads?\b/i },
	{ label: "slug", pattern: /\bslugs?\b/i },
	{ label: "UUID", pattern: /\bUUIDs?\b/i },
	{ label: "JSON", pattern: /\bJSON\b/ },
	{ label: "proposal flag", pattern: /\bPROPOSAL\b/ },
	{ label: "rendering leak", pattern: /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]|Invalid Date/ },
	// "404" alone, or a code named as one; plain numbers ("the newest 500 observations") are copy.
	{ label: "status code", pattern: /\b404\b|\bHTTP\s*\d{3}\b|\b(?:status|error)\s+(?:code\s+)?\d{3}\b/i },
	{ label: "filler", pattern: /\b(seamless(ly)?|effortless(ly)?|unlock|powerful)\b|welcome to your dashboard/i },
	{ label: "exclamation mark", pattern: /[A-Za-z)]!(?=\s|$)/ },
	{ label: "emoji", pattern: /\p{Emoji_Presentation}/u }
];

/** Data the seed writes (the form's source notes and answers) is not interface copy. */
const SEEDED_DATA: RegExp[] = [
	...SEED.dataStrings.map(text => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
	/Synthetic record \d+ — 🌿/g
];

function stripData(text: string): string {
	return SEEDED_DATA.reduce((current, pattern) => current.replace(pattern, " "), text);
}

/** The words around a match, so a finding can be found on the page. */
function excerpt(text: string, index: number, length: number): string {
	const start = Math.max(0, index - 40);
	return text
		.slice(start, index + length + 40)
		.replace(/\s+/g, " ")
		.trim();
}

function findAll(text: string, list: Banned[]): string[] {
	const found: string[] = [];
	for (const { label, pattern } of list) {
		const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
		for (const match of text.matchAll(global)) {
			found.push(`${label}: "…${excerpt(text, match.index ?? 0, match[0].length)}…"`);
			if (found.length > 40) return found;
		}
	}
	return found;
}

type PageText = { text: string; attributes: string; links: string; title: string };

async function readPage(page: Page): Promise<PageText> {
	return page.evaluate(() => {
		const attributes: string[] = [];
		for (const element of Array.from(document.body.querySelectorAll("[aria-label],[title],[placeholder],[alt]"))) {
			for (const name of ["aria-label", "title", "placeholder", "alt"]) {
				const value = element.getAttribute(name);
				if (value) attributes.push(value);
			}
		}
		const links = Array.from(document.querySelectorAll("a[href]")).map(link => link.getAttribute("href") ?? "");
		return {
			text: document.body.innerText,
			attributes: attributes.join("\n"),
			links: links.join("\n"),
			title: document.title
		};
	});
}

/**
 * Visible primary (magenta) actions. Contour's Button marks its variant in `data-variant`; only a build
 * whose buttons carry no `data-variant` yet is read by the primary button classes instead.
 */
async function primaryActions(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const marked = document.querySelector("[data-variant]") !== null;
		const selector = marked
			? '[data-variant="primary"]'
			: [
					"button.bg-accent.text-on-accent",
					"a.bg-accent.text-on-accent",
					"label.bg-accent.text-on-accent",
					'[role="button"].bg-accent.text-on-accent'
				].join(",");
		const seen = new Set<Element>();
		const labels: string[] = [];
		for (const element of Array.from(document.querySelectorAll(selector))) {
			if (seen.has(element)) continue;
			seen.add(element);
			const box = element.getBoundingClientRect();
			const style = getComputedStyle(element);
			if (box.width === 0 || box.height === 0 || style.visibility === "hidden" || style.display === "none")
				continue;
			labels.push(
				(element.getAttribute("aria-label") || (element as HTMLElement).innerText || element.tagName)
					.replace(/\s+/g, " ")
					.trim()
			);
		}
		return labels;
	});
}

/** Elements that stick out past the right edge of the viewport and so scroll the whole page sideways. */
async function sidewaysScroll(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const width = document.documentElement.clientWidth;
		if (document.documentElement.scrollWidth <= width + 1) return [];
		const culprits: string[] = [];
		for (const element of Array.from(document.body.querySelectorAll("*"))) {
			const box = element.getBoundingClientRect();
			if (box.right <= width + 1 || box.width === 0) continue;
			// Only the outermost offender: skip an element whose parent already sticks out.
			const parent = element.parentElement?.getBoundingClientRect();
			if (parent && parent.right > width + 1) continue;
			const id = element.id ? `#${element.id}` : "";
			const classes = (element.getAttribute("class") ?? "").split(/\s+/).slice(0, 4).join(".");
			culprits.push(
				`${element.tagName.toLowerCase()}${id}${classes ? `.${classes}` : ""} (right ${Math.round(box.right)} px)`
			);
			if (culprits.length >= 8) break;
		}
		return [`page is ${document.documentElement.scrollWidth} px wide in a ${width} px viewport`, ...culprits];
	});
}

async function axeFindings(page: Page): Promise<string[]> {
	// next dev's own indicator is not part of the app.
	const results = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
		.exclude("nextjs-portal")
		.analyze();
	return results.violations.map(violation => {
		const targets = violation.nodes
			.slice(0, 3)
			.map(node => node.target.join(" "))
			.join(" | ");
		return `${violation.id} (${violation.impact ?? "unknown"}, ${violation.nodes.length} ${violation.nodes.length === 1 ? "element" : "elements"}): ${violation.help} → ${targets}`;
	});
}

const SCREENSHOTS = fileURLToPath(new URL("../screenshots/", import.meta.url));

export function screenshotPath(project: string, theme: "day" | "dusk", name: string): string {
	return `${SCREENSHOTS}${project}/${theme}/${name}.png`;
}

async function settle(page: Page) {
	await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
	// Let fonts and late layout land before reading colours and boxes.
	await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
	// Hide next dev's indicator from screenshots; it is not part of the app (absent under next start).
	await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => undefined);
}

/**
 * A page that should have loaded but shows a state instead: not found, signed out, a load failure or the
 * error page. The words are the shell's (NotFoundView, LoadFailure, ErrorView).
 */
const NOT_THE_PAGE =
	/This page is not on the map|Page not found|You were signed out|Couldn.t load|Something went wrong|could not be found/i;

async function capture(page: Page, testInfo: TestInfo, theme: "day" | "dusk", name: string) {
	const path = screenshotPath(testInfo.project.name, theme, name);
	mkdirSync(dirname(path), { recursive: true });
	await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

/** Turns on Dusk the way the account menu does (the `fm-theme` key), then reloads so it applies before paint. */
async function switchToDusk(page: Page) {
	await page.evaluate(() => {
		try {
			localStorage.setItem("fm-theme", "dusk");
		} catch {
			// Storage refused: the attribute below still applies the theme for this load.
		}
		document.documentElement.setAttribute("data-theme", "dusk");
	});
	await page.reload();
	await settle(page);
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dusk");
}

export type ScanOptions = {
	/** Screenshot file name, without extension. */
	name: string;
	/** Run axe in Day and Dusk (the 1440 and 390 projects); the tablet projects only take screenshots. */
	axe?: boolean;
	/** The visible primary actions allowed on this page. One, except where the page has none. */
	maxPrimary?: number;
	/** The HTTP status the page should answer with. 200 unless the route is a designed not-found page. */
	status?: number;
	/** false: skip the jargon list (legal pages only). Sample strings are always checked. */
	copyRules?: boolean;
	/** A signed-in page inside the seeded workspace, where the real study's names must not appear. */
	workspace?: boolean;
};

/**
 * Opens `path` and scans it: the status; sample strings and jargon in text, labels and links; at most one
 * primary action; no sideways scroll; no load failure or uncaught error; axe in Day and Dusk; and
 * full-page screenshots in both themes under web/e2e/screenshots/<project>/<theme>/<name>.png.
 */
export async function scanRoute(page: Page, testInfo: TestInfo, path: string, options: ScanOptions): Promise<void> {
	const { name, axe = true, maxPrimary = 1, status = 200, copyRules = true, workspace = false } = options;
	const pageErrors: string[] = [];
	page.on("pageerror", error => pageErrors.push(error.message));
	const response = await page.goto(path);
	await settle(page);

	const read = await readPage(page);
	const visible = stripData(`${read.title}\n${read.text}`);
	const labels = stripData(read.attributes);
	const failure = read.text.search(NOT_THE_PAGE);
	const findings = {
		url: page.url(),
		status: response?.status() ?? null,
		sample: [
			...findAll(visible, SAMPLE),
			...findAll(labels, SAMPLE),
			...findAll(read.links, SAMPLE),
			...(workspace ? [...findAll(visible, HARD_CODED), ...findAll(labels, HARD_CODED)] : [])
		],
		jargon: copyRules
			? [...findAll(visible, JARGON), ...findAll(labels, JARGON).map(found => `label ${found}`)]
			: [],
		primary: await primaryActions(page),
		sideways: await sidewaysScroll(page),
		loadFailure: status === 200 && failure >= 0 ? [excerpt(read.text, failure, 60)] : [],
		axeDay: [] as string[],
		axeDusk: [] as string[],
		pageErrors
	};
	await capture(page, testInfo, "day", name);
	if (axe) findings.axeDay = await axeFindings(page);

	await switchToDusk(page);
	await capture(page, testInfo, "dusk", name);
	if (axe) findings.axeDusk = await axeFindings(page);

	await testInfo.attach(`honesty-${name}.json`, {
		body: JSON.stringify(findings, null, 2),
		contentType: "application/json"
	});

	expect.soft(findings.status, `HTTP status of ${path}`).toBe(status);
	expect.soft(findings.sample, "sample-workspace strings").toEqual([]);
	expect.soft(findings.jargon, "jargon and copy-rule breaks").toEqual([]);
	expect
		.soft(findings.primary.length, `primary actions: ${JSON.stringify(findings.primary)}`)
		.toBeLessThanOrEqual(maxPrimary);
	expect.soft(findings.sideways, "sideways page scroll").toEqual([]);
	expect.soft(findings.loadFailure, "the page shows not found, signed out or a load failure").toEqual([]);
	if (axe) {
		expect.soft(findings.axeDay, "axe in Day").toEqual([]);
		expect.soft(findings.axeDusk, "axe in Dusk").toEqual([]);
	}
	expect.soft(findings.pageErrors, "uncaught errors in the page").toEqual([]);
}
