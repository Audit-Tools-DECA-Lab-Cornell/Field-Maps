import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";

export type StubPageProps = {
	title: ReactNode;
	lead?: ReactNode;
	/** The screen's name in the development note: "Observation data". */
	screen: string;
	/**
	 * For a page other screens send people to (the project overview): a production build shows a plain
	 * placeholder island instead of answering 404.
	 */
	keepInProduction?: boolean;
};

/**
 * A tab whose screen arrives later in this build. In development it shows the designed title and lead and
 * says which screen is coming; a production build has no page here yet, so it answers 404.
 */
export function StubPage({ title, lead, screen, keepInProduction = false }: StubPageProps) {
	if (process.env.NODE_ENV === "production") {
		if (!keepInProduction) notFound();
		return (
			<div className="flex flex-col gap-8">
				<PageHeader title={title} lead={lead} />
				<Island>
					<p className="type-body text-ink-2">This screen is being rebuilt. Your data is unchanged.</p>
				</Island>
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-8">
			<PageHeader title={title} lead={lead} />
			<Note>Coming in this build: {screen}</Note>
		</div>
	);
}
