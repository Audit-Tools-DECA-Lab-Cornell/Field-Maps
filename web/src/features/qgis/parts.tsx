import { Fragment } from "react";

import { Icon } from "@/components/contour/Icon";
import { cx } from "@/lib/cx";

/** "QGIS → SITE PACKAGE → COLLECTOR": the direction data travels, as mono pills joined by arrows. */
export function FlowChips({ steps, label, className }: { steps: string[]; label: string; className?: string }) {
	return (
		<ol aria-label={label} className={cx("flex flex-wrap items-center gap-x-2 gap-y-2", className)}>
			{steps.map((step, index) => (
				<Fragment key={step}>
					<li className="inline-flex min-h-9 items-center rounded-pill border border-edge bg-island px-3.5 type-mono-label text-ink">
						{step}
					</li>
					{index < steps.length - 1 && (
						<li aria-hidden="true" className="text-ink-2">
							<Icon name="arrow-right" size={16} />
						</li>
					)}
				</Fragment>
			))}
		</ol>
	);
}

/** The mono eyebrow over an island's heading: "INBOUND · MAP PACKAGES". Type it in normal case. */
export function Eyebrow({ children }: { children: string }) {
	return <p className="type-mono-label text-ink-2">{children}</p>;
}
