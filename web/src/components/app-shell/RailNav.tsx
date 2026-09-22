"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SECTIONS } from "./sections";

/**
 * The section rail. Selected is an accent bar down the left edge plus an accent tint — the same
 * mark the collector's `OptionButton` uses for a chosen answer, so a selection means one thing
 * across both applications.
 *
 * Narrow windows get the same list laid along the top instead, scrolling sideways on its own
 * rather than taking the page with it.
 */
export function RailNav({ counts }: { readonly counts: Readonly<Record<string, string>> }) {
	const pathname = usePathname();

	return (
		<nav
			aria-label="Sections"
			className="flex gap-hair overflow-x-auto p-snug [scrollbar-width:none] md:flex-col md:overflow-x-visible">
			{SECTIONS.map(section => {
				const active = section.href === "/" ? pathname === "/" : pathname.startsWith(section.href);
				const count = counts[section.href];
				return (
					<Link
						key={section.href}
						href={section.href}
						aria-current={active ? "page" : undefined}
						className={`flex min-h-10 shrink-0 items-center justify-between gap-snug rounded-md border-l-2 px-snug py-tight transition-colors duration-100 md:shrink ${
							active
								? "border-l-accent-400 bg-accent-900 text-accent-200"
								: "border-l-transparent text-neutral-400 hover:bg-ink-tint hover:text-neutral-200"
						}`}>
						<span className={`truncate text-detail ${active ? "font-medium" : ""}`}>{section.label}</span>
						{count !== undefined && (
							<span
								className={`tnum shrink-0 text-micro ${active ? "text-accent-400" : "text-neutral-600"}`}>
								{count}
							</span>
						)}
					</Link>
				);
			})}
		</nav>
	);
}
