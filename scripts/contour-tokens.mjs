#!/usr/bin/env node
// Generates web/src/styles/contour.css from contracts/contour.json, the Contour token contract that
// the web workspace and the mobile collector share. Plain Node ESM, no dependencies.
//
//   node scripts/contour-tokens.mjs           write the stylesheet
//   node scripts/contour-tokens.mjs --check   fail if the stylesheet has drifted, or if any declared
//                                             colour pair misses its WCAG contrast minimum in either theme

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const contractPath = join(repoRoot, "contracts", "contour.json");
const outputPath = join(repoRoot, "web", "src", "styles", "contour.css");
const check = process.argv.includes("--check");

const contract = JSON.parse(readFileSync(contractPath, "utf8"));

/** camelCase → kebab-case, with digits split off: ink2 → ink-2, onNavCurrent → on-nav-current. */
function kebab(name) {
	return name
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([a-zA-Z])(\d)/g, "$1-$2")
		.toLowerCase();
}

function px(value) {
	return value === 0 ? "0" : `${value}px`;
}

function em(value) {
	return value === 0 ? "0" : `${value}em`;
}

function bezier([a, b, c, d]) {
	return `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
}

// ── Contrast ───────────────────────────────────────────────────────────────────────────────────

function channel(hex, offset) {
	const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
	return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
	return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

function contrastRatio(a, b) {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

function contrastProblems() {
	const problems = [];
	const minimums = { text: 4.5, ui: 3 };
	for (const theme of Object.keys(contract.themes)) {
		const colours = contract.themes[theme];
		for (const [kind, minimum] of Object.entries(minimums)) {
			for (const [foreground, background] of contract.contrast[kind]) {
				const fg = colours[foreground];
				const bg = colours[background];
				if (!fg || !bg) {
					problems.push(`${theme}: ${foreground}/${background} names a colour the theme does not define`);
					continue;
				}
				const ratio = contrastRatio(fg.slice(0, 7), bg.slice(0, 7));
				if (ratio < minimum)
					problems.push(
						`${theme}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1, below the ${kind} minimum of ${minimum}:1`
					);
			}
		}
	}
	return problems;
}

// ── Stylesheet ─────────────────────────────────────────────────────────────────────────────────

function themeBlock(selector, theme, scheme) {
	const lines = Object.entries(contract.themes[theme]).map(([name, value]) => `\t--ct-${kebab(name)}: ${value};`);
	return `${selector} {\n${lines.join("\n")}\n\tcolor-scheme: ${scheme};\n}`;
}

function colourMappings() {
	return Object.keys(contract.themes.day).map(name => `\t--color-${kebab(name)}: var(--ct-${kebab(name)});`);
}

function typeUtilities() {
	return Object.entries(contract.type.web)
		.filter(([name]) => !name.startsWith("$"))
		.map(([name, role]) => {
			const lines = [
				role.mono ? "\tfont-family: var(--font-mono);" : "\tfont-family: var(--font-sans);",
				`\tfont-size: ${px(role.size)};`,
				`\tline-height: ${px(role.lineHeight)};`,
				`\tfont-weight: ${role.weight};`,
				`\tletter-spacing: ${em(role.tracking)};`
			];
			if (role.caps) lines.push("\ttext-transform: uppercase;");
			if (!role.mono && role.size >= 26) lines.push("\ttext-wrap: balance;");
			return `@utility type-${kebab(name)} {\n${lines.join("\n")}\n}`;
		});
}

function build() {
	const web = contract.layout.web;
	const radius = contract.radius.web;
	const size = contract.size.web;
	const motion = contract.motion;

	const staticTheme = [
		...Object.entries(radius).map(([name, value]) => `\t--radius-${kebab(name)}: ${value === 999 ? "9999px" : px(value)};`),
		`\t--spacing-control: ${px(size.control)};`,
		`\t--spacing-control-sm: ${px(size.controlSm)};`,
		`\t--spacing-touch: ${px(size.touch)};`,
		`\t--spacing-table-header: ${px(size.tableHeader)};`,
		`\t--spacing-table-row: ${px(size.tableRow)};`,
		`\t--spacing-gutter: ${px(web.gutter)};`,
		`\t--spacing-island-pad: ${px(web.islandPadding)};`,
		`\t--spacing-header: ${px(web.headerHeight)};`,
		`\t--container-page: ${px(web.maxWidth)};`,
		...Object.entries(motion.easing).map(([name, curve]) => `\t--ease-${kebab(name)}: ${bezier(curve)};`)
	];

	const motionVars = [
		...Object.entries(motion.duration).map(([name, value]) => `\t--ct-duration-${kebab(name)}: ${value}ms;`),
		`\t--ct-duration-reduced-fade: ${motion.reducedFade}ms;`,
		...Object.entries(motion.easing).map(([name, curve]) => `\t--ct-ease-${kebab(name)}: ${bezier(curve)};`),
		`\t--ct-size-ledge: ${px(size.ledge)};`,
		`\t--ct-size-focus-ring: ${px(size.focusRing)};`,
		`\t--ct-size-focus-gap: ${px(size.focusGap)};`
	];

	return [
		"/* Generated by scripts/contour-tokens.mjs from contracts/contour.json. Do not edit by hand:",
		"   change the contract and run `pnpm tokens`. `pnpm tokens:check` fails on drift and on contrast. */",
		"",
		themeBlock(':root,\n[data-theme="day"]', "day", "light"),
		"",
		themeBlock('[data-theme="dusk"]', "dusk", "dark"),
		"",
		`:root {\n${motionVars.join("\n")}\n}`,
		"",
		"/* Utilities resolve these at the element, so a nested data-theme scope (the printed report, the",
		"   collector preview) switches every colour beneath it. */",
		"@theme inline {",
		...colourMappings(),
		`\t--shadow-ledge: 0 ${px(size.ledge)} 0 0 var(--ct-ledge);`,
		"}",
		"",
		"@theme {",
		...staticTheme,
		"}",
		"",
		...typeUtilities().flatMap(block => [block, ""])
	].join("\n");
}

const stylesheet = build();
const problems = contrastProblems();

if (check) {
	let current = "";
	try {
		current = readFileSync(outputPath, "utf8");
	} catch {
		problems.push(`${outputPath} is missing; run pnpm tokens`);
	}
	if (current && current !== stylesheet)
		problems.push("web/src/styles/contour.css has drifted from contracts/contour.json; run pnpm tokens");
	if (problems.length) {
		for (const problem of problems) console.error(`tokens:check: ${problem}`);
		process.exit(1);
	}
	console.log("tokens:check: contour.css matches contracts/contour.json and every contrast pair passes.");
} else {
	writeFileSync(outputPath, stylesheet);
	console.log(`tokens: wrote ${outputPath}`);
	if (problems.length) {
		for (const problem of problems) console.error(`tokens: ${problem}`);
		process.exit(1);
	}
}
