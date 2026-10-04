import path from "node:path";

import type { NextConfig } from "next";

// Vercel builds from the repository root with Root Directory set to web/, and its Next.js adapter
// resolves every build output path against the repository root. Next.js reports those paths
// relative to this tracing root, so it must be the repository root, not web/. Next.js requires
// turbopack.root to match it.
const repositoryRoot = path.join(__dirname, "..");

/** The Nocturne workspace's addresses, now pages of Play Study under its organization (D21). */
const PLAY_STUDY = "/o/deca/p/play-study";
const OLD_ROUTES: [string, string][] = [
	["/overview", PLAY_STUDY],
	["/observations", `${PLAY_STUDY}/data`],
	["/places", `${PLAY_STUDY}/sites`],
	["/basemaps", `${PLAY_STUDY}/sites/riverside/packages`],
	["/instrument", `${PLAY_STUDY}/forms`],
	["/qgis", `${PLAY_STUDY}/qgis`]
];

const nextConfig: NextConfig = {
	turbopack: { root: repositoryRoot },
	outputFileTracingRoot: repositoryRoot,
	// Temporary (307) redirects: the query string is carried over.
	async redirects() {
		return OLD_ROUTES.map(([source, destination]) => ({ source, destination, permanent: false }));
	}
};

export default nextConfig;
