// Dependency-free inline icon set. 16px, stroke = currentColor.
// Usage: <Icon name="edit" /> — size/color via props or CSS color.

export type IconName =
	| "edit"
	| "plus"
	| "boundary"
	| "sync"
	| "retry"
	| "check"
	| "check-circle"
	| "warning"
	| "error"
	| "x"
	| "chevron-down"
	| "chevron-right"
	| "chevron-up"
	| "layers"
	| "filter"
	| "search"
	| "pin"
	| "list"
	| "activity"
	| "chart"
	| "clock"
	| "droplet"
	| "gauge"
	| "target"
	| "trash"
	| "eye"
	| "arrow-right"
	| "wifi"
	| "wifi-off"
	| "bookmark"
	| "info"
	| "user"
	| "gate"
	| "sensor";

const paths: Record<IconName, React.ReactNode> = {
	edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
	plus: <path d="M12 5v14M5 12h14" />,
	boundary: (
		<>
			<path d="M4 7l8-4 8 4-8 4-8-4Z" />
			<path d="M4 7v6l8 4 8-4V7" />
		</>
	),
	sync: (
		<>
			<path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" />
			<path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" />
			<path d="M20 3v5h-5M4 21v-5h5" />
		</>
	),
	retry: (
		<>
			<path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
			<path d="M3 3v5h5" />
		</>
	),
	check: <path d="M20 6 9 17l-5-5" />,
	"check-circle": (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M8.5 12.5 11 15l4.5-5" />
		</>
	),
	warning: (
		<>
			<path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
			<path d="M12 9v4M12 17h.01" />
		</>
	),
	error: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M15 9l-6 6M9 9l6 6" />
		</>
	),
	x: <path d="M18 6 6 18M6 6l12 12" />,
	"chevron-down": <path d="m6 9 6 6 6-6" />,
	"chevron-right": <path d="m9 6 6 6-6 6" />,
	"chevron-up": <path d="m6 15 6-6 6 6" />,
	layers: (
		<>
			<path d="m12 2 9 5-9 5-9-5 9-5Z" />
			<path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
		</>
	),
	filter: <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />,
	search: (
		<>
			<circle cx="11" cy="11" r="7" />
			<path d="m21 21-4.3-4.3" />
		</>
	),
	pin: (
		<>
			<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
			<circle cx="12" cy="10" r="3" />
		</>
	),
	list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
	activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
	chart: <path d="M3 3v18h18M8 17v-5M13 17V8M18 17v-8" />,
	clock: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</>
	),
	droplet: <path d="M12 2.7 6.3 9a8 8 0 1 0 11.4 0L12 2.7Z" />,
	gauge: (
		<>
			<path d="M12 14 16 9" />
			<path d="M3.5 18a9 9 0 1 1 17 0" />
		</>
	),
	target: (
		<>
			<circle cx="12" cy="12" r="9" />
			<circle cx="12" cy="12" r="4" />
			<path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
		</>
	),
	trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />,
	eye: (
		<>
			<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
			<circle cx="12" cy="12" r="3" />
		</>
	),
	"arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
	wifi: (
		<>
			<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
			<path d="M12 19.5h.01" />
		</>
	),
	"wifi-off": (
		<>
			<path d="M1 1l22 22M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.5M19 12.5a10 10 0 0 0-4.5-2.7" />
			<path d="M12 19.5h.01" />
		</>
	),
	bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />,
	info: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 16v-4M12 8h.01" />
		</>
	),
	user: (
		<>
			<circle cx="12" cy="8" r="4" />
			<path d="M4 21a8 8 0 0 1 16 0" />
		</>
	),
	gate: <path d="M3 21V8l9-4 9 4v13M3 12h18M9 8v13M15 8v13" />,
	sensor: (
		<>
			<circle cx="12" cy="12" r="2" />
			<path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M5 5a10 10 0 0 0 0 14M19 19a10 10 0 0 0 0-14" />
		</>
	)
};

export function Icon({
	name,
	size = 16,
	strokeWidth = 1.8,
	className = "",
	style
}: {
	name: IconName;
	size?: number;
	strokeWidth?: number;
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			style={{ flex: "none", ...style }}
			aria-hidden="true">
			{paths[name]}
		</svg>
	);
}
