/**
 * The footer line every auth page carries (D20): these pages run on sample data and send nothing. It
 * repeats the Preview data marker's sentence word for word.
 */
export function PreviewLine() {
	return (
		<footer className="border-t border-line">
			<p className="mx-auto flex w-full max-w-(--container-page) flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-6 type-small text-ink-2 md:px-gutter xl:px-14">
				<span className="type-mono-label">Preview data</span>
				<span>Everything here is sample data. Nothing is read from or written to the FieldMaps database.</span>
			</p>
		</footer>
	);
}
