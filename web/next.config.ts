import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

// Vercel builds from the repository root with Root Directory set to web/, and its Next.js adapter
// resolves every build output path against the repository root. Next.js reports those paths
// relative to this tracing root, so it must be the repository root, not web/. Next.js requires
// turbopack.root to match it.
const repositoryRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
	turbopack: { root: repositoryRoot },
	outputFileTracingRoot: repositoryRoot,
	async headers() {
		return [
			{
				source: "/sw.js",
				headers: [
					{ key: "Content-Type", value: "application/javascript; charset=utf-8" },
					{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }
				]
			}
		];
	}
};

export default function config(phase: string): NextConfig {
	if (phase !== PHASE_PRODUCTION_BUILD && phase !== PHASE_DEVELOPMENT_SERVER) return nextConfig;
	const buildId = (process.env.FIELDMAPS_SERVICE_WORKER_BUILD_ID ??= randomUUID());
	const source = readFileSync(path.join(__dirname, "src/lib/pwa/service-worker.js"), "utf8");
	writeFileSync(path.join(__dirname, "public/sw.js"), source.replace("__FIELDMAPS_BUILD_ID__", buildId));
	return { ...nextConfig, generateBuildId: async () => buildId };
}
