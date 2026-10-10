"use client";

import { ErrorView } from "@/components/shell/ErrorView";
import { ShellMain } from "@/components/shell/ShellMain";

/** A page under the organization failed to render (org-19). The header stays; the page offers a retry. */
export default function OrgError({
	error,
	unstable_retry
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	return (
		<ShellMain>
			<title>Something went wrong · DECA Mark</title>
			<ErrorView error={error} retry={unstable_retry} />
		</ShellMain>
	);
}
