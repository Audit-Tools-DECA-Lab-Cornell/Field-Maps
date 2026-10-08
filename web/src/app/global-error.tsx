"use client";

import "./globals.css";

import { Button, ButtonLink } from "@/components/contour/Button";
import { THEME_SCRIPT } from "@/lib/theme-script";

/**
 * The last resort, when the root layout itself fails: a minimal document with the error's words and a
 * retry. It carries its own <html>, styles and theme, since the root layout is not there.
 */
export default function GlobalError({
	unstable_retry
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	return (
		<html lang="en" data-theme="day" suppressHydrationWarning>
			<head>
				<title>Something went wrong · FieldMaps</title>
				<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
			</head>
			<body className="bg-ground text-ink">
				<main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-4 px-4 py-14 md:px-gutter">
					<p className="type-mono-label text-ink-2">Request interrupted</p>
					<h1 className="type-page text-ink">Something went wrong.</h1>
					<p className="type-lead text-ink-2">
						FieldMaps could not load this page. Your records remain available, and records on devices are
						not affected. Try again, or reload the page.
					</p>
					<div className="mt-2 flex flex-wrap gap-3">
						<Button icon="rotate-cw" onClick={unstable_retry}>
							Try again
						</Button>
						<ButtonLink href="/" variant="outline">
							Return to the start page
						</ButtonLink>
					</div>
				</main>
			</body>
		</html>
	);
}
