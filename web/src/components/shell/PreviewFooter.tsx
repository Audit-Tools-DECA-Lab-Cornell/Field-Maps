"use client";

import { usePreview } from "@/features/shell/PreviewProvider";
import { getOrg } from "@/fixtures";

/**
 * The one footer line every workspace page carries (D20): the pages run on sample records and send nothing.
 */
export function PreviewFooter() {
	const { scope } = usePreview();
	const org = getOrg(scope.org);
	return (
		<footer className="border-t border-rule">
			<div className="mx-auto flex w-full max-w-page flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-6 type-small text-ink-2 md:px-gutter">
				<p>
					<span className="type-mono-label">Preview data</span> · Sample records for review. Nothing here is
					sent to or read from the FieldMaps database.
				</p>
				<p>FieldMaps · {org?.name ?? "DECA Lab"}</p>
			</div>
		</footer>
	);
}
