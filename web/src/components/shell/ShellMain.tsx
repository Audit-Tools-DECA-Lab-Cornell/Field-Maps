import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type ShellMainProps = {
	/** The page sits under a tab bar, 40 px below it; otherwise 24 px below the header. */
	afterTabs?: boolean;
	className?: string;
	children: ReactNode;
};

/** The page's content: the skip link's target and the 1440 px column with the page gutter. */
export function ShellMain({ afterTabs = false, className, children }: ShellMainProps) {
	return (
		<main
			id="main"
			tabIndex={-1}
			className={cx(
				"mx-auto w-full max-w-page flex-1 px-4 pb-14 md:px-gutter",
				afterTabs ? "pt-8 md:pt-10" : "pt-6",
				className
			)}>
			{children}
		</main>
	);
}

/** The row under the header that holds a tab bar, aligned with the page column. */
export function ShellTabsRow({ children }: { children: ReactNode }) {
	return <div className="mx-auto w-full max-w-page px-4 pt-2 md:px-gutter md:pt-4">{children}</div>;
}
