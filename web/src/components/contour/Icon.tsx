import {
	Archive,
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowUpRight,
	BookOpen,
	Building2,
	Calendar,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	CircleAlert,
	CircleCheck,
	CircleHelp,
	Clock,
	CloudCheck,
	Compass,
	Copy,
	CornerDownLeft,
	Crosshair,
	Download,
	Ellipsis,
	ExternalLink,
	Eye,
	EyeOff,
	FileDown,
	FileText,
	Flag,
	Folder,
	Funnel,
	GripVertical,
	Hash,
	History,
	Inbox,
	Info,
	KeyRound,
	Layers,
	LayoutGrid,
	Link,
	List,
	LocateFixed,
	Lock,
	LogIn,
	LogOut,
	type LucideIcon,
	Mail,
	Map,
	MapPin,
	MapPinned,
	Minus,
	Moon,
	Move,
	Package,
	Pencil,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	RotateCw,
	Ruler,
	ScanQrCode,
	Search,
	Send,
	Settings,
	ShieldCheck,
	Smartphone,
	Sun,
	Table,
	Tablet,
	Trash2,
	TriangleAlert,
	Undo2,
	Upload,
	User,
	Users,
	Wifi,
	WifiOff,
	X
} from "lucide-react";
import type { SVGProps } from "react";

/**
 * The Contour icon set: Lucide, by its kebab-case name, plus `held`, the Contour two-bar glyph.
 * Names match contracts/contour.json and the collector's registry, so a state carries the same glyph
 * on every screen. Icons are decorative by default; the word beside them is what a reader hears.
 */
const LUCIDE = {
	archive: Archive,
	"arrow-down": ArrowDown,
	"arrow-left": ArrowLeft,
	"arrow-right": ArrowRight,
	"arrow-up": ArrowUp,
	"arrow-up-right": ArrowUpRight,
	"book-open": BookOpen,
	"building-2": Building2,
	calendar: Calendar,
	check: Check,
	"chevron-down": ChevronDown,
	"chevron-left": ChevronLeft,
	"chevron-right": ChevronRight,
	"chevron-up": ChevronUp,
	"circle-alert": CircleAlert,
	"circle-check": CircleCheck,
	"circle-help": CircleHelp,
	clock: Clock,
	"cloud-check": CloudCheck,
	compass: Compass,
	copy: Copy,
	"corner-down-left": CornerDownLeft,
	crosshair: Crosshair,
	download: Download,
	ellipsis: Ellipsis,
	"external-link": ExternalLink,
	eye: Eye,
	"eye-off": EyeOff,
	"file-down": FileDown,
	"file-text": FileText,
	flag: Flag,
	folder: Folder,
	funnel: Funnel,
	"grip-vertical": GripVertical,
	hash: Hash,
	history: History,
	inbox: Inbox,
	info: Info,
	"key-round": KeyRound,
	layers: Layers,
	"layout-grid": LayoutGrid,
	link: Link,
	list: List,
	"locate-fixed": LocateFixed,
	lock: Lock,
	"log-in": LogIn,
	"log-out": LogOut,
	mail: Mail,
	map: Map,
	"map-pin": MapPin,
	"map-pinned": MapPinned,
	minus: Minus,
	moon: Moon,
	move: Move,
	package: Package,
	pencil: Pencil,
	plus: Plus,
	printer: Printer,
	"qr-code": QrCode,
	"refresh-cw": RefreshCw,
	"rotate-cw": RotateCw,
	ruler: Ruler,
	"scan-qr-code": ScanQrCode,
	search: Search,
	send: Send,
	settings: Settings,
	"shield-check": ShieldCheck,
	smartphone: Smartphone,
	sun: Sun,
	table: Table,
	tablet: Tablet,
	"trash-2": Trash2,
	"triangle-alert": TriangleAlert,
	"undo-2": Undo2,
	upload: Upload,
	user: User,
	users: Users,
	wifi: Wifi,
	"wifi-off": WifiOff,
	x: X
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof LUCIDE | "held";

export const ICON_NAMES = [...Object.keys(LUCIDE), "held"] as IconName[];

export function isIconName(name: string): name is IconName {
	return name === "held" || name in LUCIDE;
}

type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
	name: IconName;
	/** Pixel size of the square glyph. Defaults to 18, the size beside 16 px text. */
	size?: number;
	/** Lucide's stroke width. Contour draws at 2. */
	strokeWidth?: number;
	/** Give the icon a name for assistive technology only when no visible word accompanies it. */
	label?: string;
};

/** Two vertical bars, the Contour "held" glyph: lighter than Lucide's pause, and never read as a media control. */
function HeldGlyph({ size, strokeWidth, ...rest }: Omit<IconProps, "name" | "label">) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			{...rest}>
			<path d="M9.5 6.5v11M14.5 6.5v11" />
		</svg>
	);
}

export function Icon({ name, size = 18, strokeWidth = 2, label, className, ...rest }: IconProps) {
	const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const, focusable: "false" as const };
	if (name === "held")
		return <HeldGlyph size={size} strokeWidth={strokeWidth} className={className} {...a11y} {...rest} />;
	const Glyph = LUCIDE[name];
	return (
		<Glyph
			size={size}
			strokeWidth={strokeWidth}
			absoluteStrokeWidth={false}
			className={className}
			{...a11y}
			{...rest}
		/>
	);
}
