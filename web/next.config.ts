import path from "node:path";

import type { NextConfig } from "next";

// Vercel builds from the repository root with Root Directory set to web/, and its Next.js adapter
// resolves every build output path against the repository root. Next.js reports those paths
// relative to this tracing root, so it must be the repository root, not web/. Next.js requires
// turbopack.root to match it.
const repositoryRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
	turbopack: { root: repositoryRoot },
	outputFileTracingRoot: repositoryRoot
};

export default nextConfig;
