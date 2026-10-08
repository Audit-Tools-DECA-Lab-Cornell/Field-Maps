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
  Map as MapIcon,
  MapPin,
  MapPinned,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Move,
  Navigation,
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
  X,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

/**
 * The Contour icon set on the collector: Lucide by its kebab-case name, plus `held`, the two-bar
 * glyph. The names are the web registry's (web/src/components/contour/Icon.tsx), so a state carries
 * the same glyph on the phone and in the workspace. Icons are decorative unless given a label: the
 * word beside them is what a screen reader announces.
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
  map: MapIcon,
  "map-pin": MapPin,
  "map-pinned": MapPinned,
  maximize: Maximize2,
  minimize: Minimize2,
  minus: Minus,
  moon: Moon,
  move: Move,
  navigation: Navigation,
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
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof LUCIDE | "held";

export function isIconName(name: string): name is IconName {
  return name === "held" || name in LUCIDE;
}

export type IconProps = {
  name: IconName;
  size?: number | undefined;
  color: string;
  strokeWidth?: number | undefined;
  /** Only when no visible word accompanies the icon. */
  accessibilityLabel?: string | undefined;
};

export function Icon({ name, size = 18, color, strokeWidth = 2, accessibilityLabel }: IconProps) {
  const a11y = accessibilityLabel
    ? { accessible: true, accessibilityRole: "image" as const, accessibilityLabel }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      };
  if (name === "held")
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...a11y}>
        <Path
          d="M9.5 6.5v11M14.5 6.5v11"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    );
  const Glyph = LUCIDE[name];
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} {...a11y} />;
}
