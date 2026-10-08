import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type RoleLabelProps = {
	/** The role word in sentence case ("Manager"). The mono label style sets it in capitals. */
	children: ReactNode;
	className?: string;
};

/** The reader's role beside the account button ("MANAGER"), in the mono eyebrow style. */
export function RoleLabel({ children, className }: RoleLabelProps) {
	return <span className={cx("type-mono-label text-ink-2", className)}>{children}</span>;
}
