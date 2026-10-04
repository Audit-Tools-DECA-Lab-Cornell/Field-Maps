import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TextLink } from "@/components/contour/TextLink";
import { ToastProvider } from "@/components/contour/Toast";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { PreviewLine } from "@/features/auth/PreviewLine";
import { PREVIEW_ORG_HREF } from "@/features/onboarding/steps";

export const metadata: Metadata = {
	robots: { index: false, follow: false }
};

/**
 * The first-workspace set-up (org-13): the brand and "Save and finish later" above, one toast host that
 * outlives the move from step to step, a skip link, and the Preview data footer line. There is no
 * workspace chrome yet, since there is no project to switch to.
 */
export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<ToastProvider>
			<div className="relative flex min-h-dvh flex-col bg-ground">
				<a
					href="#main"
					className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-4 focus-visible:z-50 focus-visible:inline-flex focus-visible:min-h-touch focus-visible:items-center focus-visible:rounded-pill focus-visible:border-2 focus-visible:border-ink focus-visible:bg-island focus-visible:px-5 focus-visible:font-semibold focus-visible:text-ink">
					Skip to content
				</a>
				<PublicHeader>
					<TextLink href={PREVIEW_ORG_HREF} tone="ink" className="inline-flex min-h-touch items-center">
						Save and finish later
					</TextLink>
				</PublicHeader>
				<main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
					{children}
				</main>
				<PreviewLine />
			</div>
		</ToastProvider>
	);
}
