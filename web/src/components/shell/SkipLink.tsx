/** The first stop on every workspace page: hidden until focused, then a pill that jumps past the header. */
export function SkipLink() {
	return (
		<a
			href="#main"
			className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-4 focus-visible:z-50 focus-visible:inline-flex focus-visible:min-h-touch focus-visible:items-center focus-visible:rounded-pill focus-visible:border-2 focus-visible:border-ink focus-visible:bg-island focus-visible:px-5 focus-visible:font-semibold focus-visible:text-ink">
			Skip to content
		</a>
	);
}
