import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
		"src/lib/api/schema.d.ts",
		"scripts/**"
	]),
	{
		files: ["**/*.{ts,tsx}"],
		plugins: {
			"simple-import-sort": simpleImportSort
		},
		rules: {
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error"
		}
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		rules: {
			"react-hooks/incompatible-library": "off"
		}
	},
	// Contour code stands apart from the Nocturne screens it replaces: no prototype data module, Nocturne
	// chrome or old app shell. Phase 5 deletes those modules; until then this keeps new code off them.
	{
		files: [
			"src/components/contour/**/*.{ts,tsx}",
			"src/components/map/**/*.{ts,tsx}",
			"src/app/dev/**/*.{ts,tsx}",
			"src/features/**/*.{ts,tsx}",
			"src/fixtures/**/*.{ts,tsx}",
			"src/components/shell/**/*.{ts,tsx}"
		],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: [
								"@/data",
								"@/data/*",
								"@/components/nocturne",
								"@/components/nocturne/*",
								"@/components/app-shell",
								"@/components/app-shell/*"
							],
							message: "Contour code must not import Nocturne-era modules."
						},
						{
							// The same modules reached by a relative path.
							regex: "^(\\.\\./)+(data|components/(nocturne|app-shell))(/|$)",
							message: "Contour code must not import Nocturne-era modules."
						}
					]
				}
			]
		}
	}
]);

export default eslintConfig;
