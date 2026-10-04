import type { Metadata } from "next";

import { ButtonLink } from "@/components/contour/Button";
import { NotFoundView } from "@/components/shell/NotFoundView";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { SkipLink } from "@/components/shell/SkipLink";
import { PreviewLine } from "@/features/auth/PreviewLine";

export const metadata: Metadata = {
	title: "Page not found",
	robots: { index: false, follow: false }
};

/**
 * An address that matches no page (org-18 outside the workspace): the public header with Sign in and
 * Create account, then the same words and the places that do exist.
 */
export default function NotFound() {
	return (
		<div className="relative flex min-h-dvh flex-col bg-ground">
			<SkipLink />
			<PublicHeader>
				<div className="flex flex-wrap items-center gap-3">
					<ButtonLink href="/sign-in" variant="outline" size="sm">
						Sign in
					</ButtonLink>
					<ButtonLink href="/sign-up" variant="ink" size="sm">
						Create account
					</ButtonLink>
				</div>
			</PublicHeader>
			<main id="main" tabIndex={-1} className="mx-auto w-full max-w-page flex-1 px-4 pb-14 md:px-gutter">
				<NotFoundView />
			</main>
			<PreviewLine />
		</div>
	);
}
