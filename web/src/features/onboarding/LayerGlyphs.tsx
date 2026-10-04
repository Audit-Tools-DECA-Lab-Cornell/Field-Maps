/**
 * Tiny inline glyphs for the layers a QGIS export carries, drawn with `currentColor` strokes at a
 * consistent 1.5 px weight so they sit quietly beside the layer names rather than illustrating them.
 */

type GlyphProps = { readonly className?: string };

export function PolygonGlyph({ className = "" }: GlyphProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round">
			<path d="M10 3 L17 8 L14.5 16 L5.5 16 L3 8 Z" />
		</svg>
	);
}

export function ZoneGridGlyph({ className = "" }: GlyphProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round">
			<rect x="3" y="3" width="14" height="14" rx="1" />
			<path d="M3 10 H17 M10 3 V17" />
		</svg>
	);
}

export function LineGlyph({ className = "" }: GlyphProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round">
			<path d="M3 15 C7 15 7 6 10 6 S15 13 17 5" />
		</svg>
	);
}

export function PointGlyph({ className = "" }: GlyphProps) {
	return (
		<svg viewBox="0 0 20 20" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
			<circle cx="10" cy="10" r="2.25" fill="currentColor" stroke="none" />
			<circle cx="10" cy="10" r="6.5" />
		</svg>
	);
}

export function ProjectFileGlyph({ className = "" }: GlyphProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round">
			<path d="M5 2.5 H12 L15.5 6 V17.5 H5 Z" />
			<path d="M12 2.5 V6 H15.5" />
		</svg>
	);
}
