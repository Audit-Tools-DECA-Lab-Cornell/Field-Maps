"use client";

import { ErrorView } from "@/components/shell/ErrorView";

/** A project page failed to render. The header and tabs stay; the page offers a retry. */
export default function ProjectError({
	error,
	unstable_retry
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	return (
		<>
			<title>Something went wrong · FieldMaps</title>
			<ErrorView error={error} retry={unstable_retry} />
		</>
	);
}
