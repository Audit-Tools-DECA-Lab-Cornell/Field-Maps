import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/contour/Toast";
import { FlashToast } from "@/features/shell/FlashToast";

export const metadata: Metadata = {
	robots: { index: false, follow: false }
};

/**
 * Every sign-in, account and invitation page: one toast host that outlives the move from page to page
 * (and shows a message another page left, such as "Account deleted"), and a skip link. The two groups
 * inside add their header and the split frame; the invitation group, which still reads sample data,
 * adds the Preview data footer line.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<ToastProvider>
			<div className="relative flex min-h-dvh flex-col bg-ground">
				<a
					href="#main"
					className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-4 focus-visible:z-50 focus-visible:inline-flex focus-visible:min-h-touch focus-visible:items-center focus-visible:rounded-pill focus-visible:border-2 focus-visible:border-ink focus-visible:bg-island focus-visible:px-5 focus-visible:font-semibold focus-visible:text-ink">
					Skip to content
				</a>
				{children}
			</div>
			<FlashToast />
		</ToastProvider>
	);
}
