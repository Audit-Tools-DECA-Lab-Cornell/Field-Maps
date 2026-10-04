import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type GallerySectionProps = {
	/** The anchor the contents list links to. */
	id: string;
	title: string;
	/** One line on what the section shows and where it comes from. */
	lead?: ReactNode;
	className?: string;
	children: ReactNode;
};

/** One gallery section: a heading over an ink rule, as the system sheets draw it (system-04). */
export function GallerySection({ id, title, lead, className, children }: GallerySectionProps) {
	const headingId = `${id}-heading`;
	return (
		<section id={id} aria-labelledby={headingId} className={cx("flex scroll-mt-6 flex-col gap-8", className)}>
			<div className="border-b border-ink pb-3">
				<h2 id={headingId} className="type-section text-ink">
					{title}
				</h2>
				{lead != null && <p className="mt-1 max-w-prose type-body text-ink-2">{lead}</p>}
			</div>
			{children}
		</section>
	);
}

export type SpecimenProps = {
	/** The mono eyebrow, typed in normal case ("Web · 46 px"). */
	title: string;
	/** A line under the parts saying what to look for. */
	caption?: ReactNode;
	className?: string;
	children: ReactNode;
};

/** A labelled group of parts inside a section: the eyebrow, the parts, then an optional caption. */
export function Specimen({ title, caption, className, children }: SpecimenProps) {
	return (
		<div className={cx("flex min-w-0 flex-col gap-4", className)}>
			<h3 className="type-mono-label text-ink-2">{title}</h3>
			{children}
			{caption != null && <p className="max-w-prose type-small text-ink-2">{caption}</p>}
		</div>
	);
}
