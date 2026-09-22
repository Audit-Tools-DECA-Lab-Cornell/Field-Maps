export function StatusDot({ color, pulse = false, size = 8 }: { color: string; pulse?: boolean; size?: number }) {
	return (
		<span
			className={`fo-dot ${pulse ? "fo-pulse" : ""}`}
			style={{ background: color, width: size, height: size }}
		/>
	);
}
