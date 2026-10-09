/**
 * Lets the unit tests load app modules under Node's type stripping. App code imports other modules the
 * way the bundler resolves them (`./answers`, `@/lib/plan`); Node needs the file. This resolve hook adds
 * `.ts` (or `/index.ts`) to an extensionless relative import from a `.ts` file and maps `@/` to `src/`.
 *
 * Import this first, then load app modules with a dynamic `await import(…)`: static imports are resolved
 * before any module body runs, so they would not see the hook.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const SRC = new URL("../../src/", import.meta.url);
const HAS_EXTENSION = /\.(?:[cm]?[jt]sx?|json)$/;

function withTs(url) {
	for (const candidate of [`${url}.ts`, `${url}.tsx`, `${url}/index.ts`])
		if (existsSync(fileURLToPath(candidate))) return candidate;
	return null;
}

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith("@/")) {
			const target = new URL(specifier.slice(2), SRC).href;
			const found = HAS_EXTENSION.test(specifier) ? target : withTs(target);
			if (found) return { url: found, shortCircuit: true };
		}
		const fromTs = context.parentURL?.endsWith(".ts") || context.parentURL?.endsWith(".tsx");
		if (fromTs && (specifier.startsWith("./") || specifier.startsWith("../")) && !HAS_EXTENSION.test(specifier)) {
			const found = withTs(new URL(specifier, context.parentURL).href);
			if (found) return { url: found, shortCircuit: true };
		}
		return nextResolve(specifier, context);
	}
});

/** Loads a module under `src/` by its path there, e.g. `lib/time.ts`. */
export function load(path) {
	return import(new URL(path, SRC).href);
}
