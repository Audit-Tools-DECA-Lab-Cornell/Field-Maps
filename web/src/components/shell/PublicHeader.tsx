import type { ReactNode } from "react";

import { TextLink } from "@/components/contour/TextLink";
import { cx } from "@/lib/cx";

import { Brand } from "./Brand";

export type PublicHeaderProps = {
	/** Where the brand leads. */
	brandHref?: string;
	/** The right side of the header. Defaults to the Privacy link the signed-out pages carry. */
	children?: ReactNode;
	/** Keep only the mark on phones, so a long item on the right (the account chip) stays on one row. */
	brandMarkOnlyOnPhones?: boolean;
	className?: string;
};

/**
 * The header outside the workspace (Org 6–12): the brand on the left and one quiet item on the right.
 * It has no tabs, no switchers and no search.
 */
export function PublicHeader({
	brandHref = "/",
	children,
	brandMarkOnlyOnPhones = false,
	className
}: PublicHeaderProps) {
	return (
		<header className={cx("pt-3", className)}>
			<div className="mx-auto flex min-h-header w-full max-w-(--container-page) flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 md:px-gutter xl:px-23">
				<Brand href={brandHref} wordmarkFromSm={brandMarkOnlyOnPhones} />
				<div className="flex min-w-0 items-center">
					{children ?? (
						<TextLink href="/privacy" tone="ink" className="inline-flex min-h-touch items-center">
							Privacy
						</TextLink>
					)}
				</div>
			</div>
		</header>
	);
}
