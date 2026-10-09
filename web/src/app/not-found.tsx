import type { Metadata } from "next";

import { ButtonLink } from "@/components/contour/Button";
import { Icon } from "@/components/contour/Icon";
import { PAGE_TITLE_ID } from "@/components/contour/PageHeader";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { SkipLink } from "@/components/shell/SkipLink";

export const metadata: Metadata = {
	title: "Page not found",
	robots: { index: false, follow: false }
};

/**
 * An address that matches no page, outside the workspace (org-18): the public header, plain words and the
 * way back. Someone who is signed in is sent on to their projects from there; someone who is not meets
 * sign in first.
 */
export default function NotFound() {
	return (
		<div className="relative flex min-h-dvh flex-col bg-ground">
			<SkipLink />
			<PublicHeader />
			<main
				id="main"
				tabIndex={-1}
				className="mx-auto w-full max-w-page flex-1 px-4 pt-10 pb-14 md:px-gutter md:pt-16">
				<div className="flex max-w-2xl flex-col items-start">
					<span className="grid size-20 place-items-center rounded-pill border border-line bg-island text-ink shadow-ledge">
						<Icon name="map" size={32} />
					</span>
					<p className="mt-8 type-mono-label text-ink-2">Page not found</p>
					<h1 id={PAGE_TITLE_ID} tabIndex={-1} className="mt-2 type-page text-ink md:type-hero">
						This page is not on the map.
					</h1>
					<p className="mt-4 type-lead text-ink-2">
						The link may be out of date, or the page may have moved. Go to your projects to continue.
					</p>
					<ButtonLink href="/o" variant="primary" icon="arrow-right" className="mt-8">
						Go to your projects
					</ButtonLink>
				</div>
			</main>
		</div>
	);
}
