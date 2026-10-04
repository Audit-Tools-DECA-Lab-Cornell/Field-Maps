/**
 * The preview honesty layer as data (D20): who the reader is viewing as, which screen state the islands
 * show, what each role may do, and a small session store for preview-only changes. Plain module, so a
 * server component can read the constants; the React hooks over the stores live in features/shell.
 */

export type PreviewRole = "owner" | "admin" | "manager" | "viewer" | "observer";

export type PreviewScreenState = "normal" | "loading" | "empty" | "filtered" | "error" | "offline" | "no-access";

export const PREVIEW_ROLES: { value: PreviewRole; label: string }[] = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "manager", label: "Manager" },
	{ value: "viewer", label: "Viewer" },
	{ value: "observer", label: "Observer" }
];

export const PREVIEW_SCREEN_STATES: { value: PreviewScreenState; label: string }[] = [
	{ value: "normal", label: "Normal" },
	{ value: "loading", label: "Loading" },
	{ value: "empty", label: "Empty" },
	{ value: "filtered", label: "Filtered" },
	{ value: "error", label: "Error" },
	{ value: "offline", label: "Offline" },
	{ value: "no-access", label: "No access" }
];

export function isPreviewRole(value: unknown): value is PreviewRole {
	return PREVIEW_ROLES.some(role => role.value === value);
}

export function isPreviewScreenState(value: unknown): value is PreviewScreenState {
	return PREVIEW_SCREEN_STATES.some(state => state.value === value);
}

/** What a screen may let the reader do. Authorization itself lives in the database (D12); this mirrors it. */
export type PreviewAction =
	| "createProject"
	| "manageMembers"
	| "viewOrgSettings"
	| "deleteOrg"
	| "viewTeam"
	| "inviteMembers"
	| "viewProjectSettings"
	| "editProject"
	| "uploadPackage"
	| "export"
	| "readData"
	| "collect";

const MANAGER: PreviewAction[] = [
	"viewTeam",
	"inviteMembers",
	"viewProjectSettings",
	"editProject",
	"uploadPackage",
	"export",
	"readData",
	"collect"
];
const ADMIN: PreviewAction[] = [...MANAGER, "createProject", "manageMembers", "viewOrgSettings"];

/** PRODUCT.md § Roles: owner ⊃ admin ⊃ manager; a viewer reads and exports; an observer collects in the app. */
const MATRIX: Record<PreviewRole, readonly PreviewAction[]> = {
	owner: [...ADMIN, "deleteOrg"],
	admin: ADMIN,
	manager: MANAGER,
	viewer: ["readData", "export"],
	observer: ["collect"]
};

export function can(role: PreviewRole, action: PreviewAction): boolean {
	return MATRIX[role].includes(action);
}

/** View as, Show state and Reset in the Preview data popover: development and preview builds only. */
export const PREVIEW_TOOLS = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PREVIEW_TOOLS === "1";

/* ── Session stores ────────────────────────────────────────────────────────────
   Preview changes last for this tab and reset when it closes; nothing is sent anywhere. A store is read
   with useSyncExternalStore (see features/shell/useSessionStore), so every reader sees one value.
   ─────────────────────────────────────────────────────────────────────────── */

export type SessionStore<T> = {
	/** The value now. Returns the same object until it changes, as useSyncExternalStore requires. */
	get: () => T;
	/** The value on the server and during hydration: always the initial value. */
	getServer: () => T;
	/** `silent` writes without telling readers, for a write made while React is reading the store. */
	set: (next: T | ((current: T) => T), options?: { silent?: boolean }) => void;
	reset: () => void;
	subscribe: (listener: () => void) => () => void;
};

/**
 * A value kept in sessionStorage under `key` (by convention `fm.preview.<area>`). `parse` turns what was
 * stored back into a value, or returns the initial value when it is missing or malformed.
 */
export function createSessionStore<T>(key: string, initial: T, parse: (raw: unknown) => T): SessionStore<T> {
	const listeners = new Set<() => void>();
	let cachedRaw: string | null | undefined;
	let cached: T = initial;
	let memory: string | null = null; // used when storage is refused (private windows)

	function readRaw(): string | null {
		try {
			return window.sessionStorage.getItem(key);
		} catch {
			return memory;
		}
	}

	function get(): T {
		if (typeof window === "undefined") return initial;
		const raw = readRaw();
		if (raw === cachedRaw) return cached;
		cachedRaw = raw;
		if (raw === null) cached = initial;
		else {
			try {
				cached = parse(JSON.parse(raw));
			} catch {
				cached = initial;
			}
		}
		return cached;
	}

	function set(next: T | ((current: T) => T), options?: { silent?: boolean }) {
		const value = typeof next === "function" ? (next as (current: T) => T)(get()) : next;
		const raw = JSON.stringify(value);
		if (raw === readRaw()) return;
		memory = raw;
		try {
			window.sessionStorage.setItem(key, raw);
		} catch {
			// Storage refused: the change still applies to this page through `memory`.
		}
		if (options?.silent) return;
		for (const listener of listeners) listener();
	}

	function reset() {
		memory = null;
		try {
			window.sessionStorage.removeItem(key);
		} catch {
			// Nothing stored to remove.
		}
		for (const listener of listeners) listener();
	}

	function subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	return { get, getServer: () => initial, set, reset, subscribe };
}

/* ── The preview overrides ────────────────────────────────────────────────── */

export const PREVIEW_STORAGE_KEY = "fm.preview";

export type PreviewOverrides = {
	/** null: the reader's own role for the page (manager in a project, admin on the org pages). */
	role: PreviewRole | null;
	screenState: PreviewScreenState;
};

const NO_OVERRIDES: PreviewOverrides = { role: null, screenState: "normal" };

function parseOverrides(raw: unknown): PreviewOverrides {
	if (!raw || typeof raw !== "object") return NO_OVERRIDES;
	const value = raw as Record<string, unknown>;
	return {
		role: isPreviewRole(value.role) ? value.role : null,
		screenState: isPreviewScreenState(value.screenState) ? value.screenState : "normal"
	};
}

const overrides = createSessionStore<PreviewOverrides>(PREVIEW_STORAGE_KEY, NO_OVERRIDES, parseOverrides);

/**
 * `?as=viewer` and `?preview-state=empty` set the preview from a link (DESIGN §7). They are written to the
 * session store, so the choice survives moving between pages until it is reset.
 */
export function applyPreviewParams(search: URLSearchParams | string, options?: { silent?: boolean }) {
	const params = typeof search === "string" ? new URLSearchParams(search) : search;
	const as = params.get("as");
	const state = params.get("preview-state");
	const role = isPreviewRole(as) ? as : undefined;
	const screenState = isPreviewScreenState(state) ? state : undefined;
	if (role === undefined && screenState === undefined) return;
	overrides.set(
		current => ({
			role: role ?? current.role,
			screenState: screenState ?? current.screenState
		}),
		options
	);
}

let urlApplied = false;

/** The overrides store. Its first read in the browser takes in the address's preview parameters. */
export const previewStore: SessionStore<PreviewOverrides> = {
	...overrides,
	get() {
		if (!urlApplied && typeof window !== "undefined") {
			urlApplied = true;
			applyPreviewParams(window.location.search, { silent: true });
		}
		return overrides.get();
	}
};
