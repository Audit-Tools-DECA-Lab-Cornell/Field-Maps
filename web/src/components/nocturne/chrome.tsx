import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Nocturne chrome for the web, kept deliberately parallel to `mobile/src/components/chrome.tsx`.
 * A manager who has used the collector should recognise every mark here: the same rules that fade
 * at their ends, the same outlined actions, the same four chip tones, the same left-lined note.
 * When one side changes, change the other.
 */

/* ── Rules and labels ─────────────────────────────────────────────────────── */

/**
 * The Nocturne rule. It fades to transparent at both ends rather than stopping cleanly, so it
 * separates without drawing a box. `fade` shortens the ramp where the rule is short.
 */
export function FadeRule({ className = "", fade }: { readonly className?: string; readonly fade?: number }) {
	return (
		<hr
			aria-hidden
			className={`rule ${className}`}
			style={fade === undefined ? undefined : ({ "--rule-fade": `${fade}px` } as React.CSSProperties)}
		/>
	);
}

/** The quiet label above a block. Sentence case: this system does not shout. */
export function SectionLabel({
	children,
	className = ""
}: {
	readonly children: ReactNode;
	readonly className?: string;
}) {
	return <div className={`text-meta text-neutral-400 ${className}`}>{children}</div>;
}

export function Prose({
	children,
	tone = "muted",
	className = ""
}: {
	readonly children: ReactNode;
	readonly tone?: "body" | "muted" | "faint";
	readonly className?: string;
}) {
	const colour = tone === "body" ? "text-neutral-300" : tone === "faint" ? "text-neutral-500" : "text-neutral-400";
	return <p className={`text-detail ${colour} ${className}`}>{children}</p>;
}

/* ── Actions ──────────────────────────────────────────────────────────────── */

type ActionTone = "accent" | "attention";

type ActionProps = {
	readonly children: ReactNode;
	readonly onClick?: () => void;
	readonly href?: string;
	readonly disabled?: boolean;
	readonly tone?: ActionTone;
	readonly type?: "button" | "submit";
	readonly className?: string;
	readonly title?: string;
};

function actionShell(className: string, props: ActionProps) {
	const { children, onClick, href, disabled = false, type = "button", title } = props;
	if (href !== undefined && !disabled)
		return (
			<Link href={href} className={className} title={title}>
				{children}
			</Link>
		);
	return (
		<button type={type} onClick={onClick} disabled={disabled} className={className} title={title}>
			{children}
		</button>
	);
}

const ACTION_BASE =
	"inline-flex min-h-11 items-center justify-center gap-tight rounded-md px-loose text-body font-medium " +
	"transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45 [touch-action:manipulation]";

/** The primary action is an accent outline. Nocturne never floods a button with the accent. */
export function PrimaryAction(props: ActionProps) {
	const attention = props.tone === "attention";
	const line = attention ? "border-attention text-attention-text" : "border-accent text-accent-200";
	const tint = attention
		? "hover:bg-attention-ground active:bg-attention-ground"
		: "hover:bg-accent-tint active:bg-accent-tint-strong";
	return actionShell(`${ACTION_BASE} border ${line} ${tint} ${props.className ?? ""}`, props);
}

/** A second action beside the primary one: a hairline border, no accent. */
export function SecondaryAction(props: ActionProps) {
	return actionShell(
		`${ACTION_BASE} border border-rule text-neutral-300 hover:bg-ink-tint active:bg-ink-tint-strong ${props.className ?? ""}`,
		props
	);
}

/** No border at all — for the actions that sit under a block rather than beside it. */
export function GhostAction(props: ActionProps) {
	return actionShell(
		`${ACTION_BASE} border border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-300 active:bg-neutral-800 ${props.className ?? ""}`,
		props
	);
}

/** Inline, text-weight, inside prose and notes. */
export function LinkAction({
	children,
	onClick,
	href,
	muted = false,
	disabled = false,
	className = ""
}: {
	readonly children: ReactNode;
	readonly onClick?: () => void;
	readonly href?: string;
	readonly muted?: boolean;
	readonly disabled?: boolean;
	readonly className?: string;
}) {
	const shell = `text-detail rounded-sm py-tight text-left transition-opacity duration-100 hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-45 ${
		muted ? "text-neutral-400" : "text-accent-300"
	} ${className}`;
	if (href !== undefined && !disabled)
		return (
			<Link href={href} className={shell}>
				{children}
			</Link>
		);
	return (
		<button type="button" onClick={onClick} disabled={disabled} className={shell}>
			{children}
		</button>
	);
}

/**
 * A choice. Selected state is an accent tint plus a two-pixel accent bar down the left edge —
 * no outlined boxes, no uppercase micro-labels.
 */
export function OptionButton({
	label,
	detail,
	selected,
	onClick,
	disabled = false,
	count,
	variant = "filled"
}: {
	readonly label: ReactNode;
	readonly detail?: ReactNode;
	readonly selected: boolean;
	readonly onClick: () => void;
	readonly disabled?: boolean;
	readonly count?: number;
	/** `quiet` drops the resting fill, for rails where a stack of filled boxes would shout. */
	readonly variant?: "filled" | "quiet";
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-pressed={selected}
			className={`flex min-h-9 items-center justify-between gap-snug rounded-md border-l-2 px-snug py-tight text-left transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45 ${
				selected
					? "border-l-accent-400 bg-accent-800 text-accent-100"
					: variant === "quiet"
						? "border-l-transparent text-neutral-400 hover:bg-ink-tint hover:text-neutral-200"
						: "border-l-transparent bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
			}`}>
			<span className={`min-w-0 truncate text-caption ${selected ? "font-medium" : ""}`}>
				{label}
				{detail !== undefined && <span className="text-neutral-500"> {detail}</span>}
			</span>
			{count !== undefined && (
				<span className={`tnum shrink-0 text-micro ${selected ? "text-accent-200" : "text-neutral-500"}`}>
					{count}
				</span>
			)}
		</button>
	);
}

/* ── Chips ────────────────────────────────────────────────────────────────── */

export type ChipTone = "accent" | "muted" | "attention" | "live";

const CHIP_TONES: Record<ChipTone, string> = {
	accent: "bg-accent-900 text-accent-300",
	muted: "bg-neutral-900 text-neutral-400",
	attention: "bg-attention-ground text-attention-text",
	live: "bg-live-ground text-live"
};

/**
 * State is a glyph plus a word plus a colour, so the colour is never load-bearing: the chip still
 * reads in greyscale, in bright sun, and to a reader who cannot separate the two tints.
 */
export function Chip({
	children,
	tone = "muted",
	glyph,
	className = ""
}: {
	readonly children: ReactNode;
	readonly tone?: ChipTone;
	readonly glyph?: string;
	readonly className?: string;
}) {
	return (
		<span
			className={`inline-flex shrink-0 items-center gap-hair rounded-full px-snug py-hair text-micro whitespace-nowrap ${CHIP_TONES[tone]} ${className}`}>
			{glyph !== undefined && <span aria-hidden>{glyph}</span>}
			{children}
		</span>
	);
}

/* ── Notes ────────────────────────────────────────────────────────────────── */

/**
 * An attention block: a single coloured line down the left, never a filled alert box.
 * Reserved for validation, needs-attention records and unresolved protocol questions.
 */
export function AttentionNote({
	title,
	body,
	children,
	alert = false
}: {
	readonly title: ReactNode;
	readonly body?: ReactNode;
	readonly children?: ReactNode;
	readonly alert?: boolean;
}) {
	return (
		<div className="border-l-2 border-attention py-hair pl-base" role={alert ? "alert" : undefined}>
			<p className="text-body font-medium text-attention-text">{title}</p>
			{body !== undefined && <p className="mt-hair text-caption text-neutral-400">{body}</p>}
			{children}
		</div>
	);
}

/** Accent-lined note used for inherited context and other quiet emphasis. */
export function AccentNote({ children }: { readonly children: ReactNode }) {
	return <div className="border-l-2 border-accent py-hair pl-base">{children}</div>;
}

/* ── Surfaces ─────────────────────────────────────────────────────────────── */

/** Translucent dark glass for map chrome, so the map keeps reading through its own controls. */
export function Glass({ children, className = "" }: { readonly children: ReactNode; readonly className?: string }) {
	return <div className={`rounded-md border border-edge bg-glass backdrop-blur-md ${className}`}>{children}</div>;
}

/**
 * A region of the workspace. Panels are separated by the hairline on their shared seam, not by a
 * box drawn around each one — the ground shows through and the eye follows the content.
 */
export function Panel({
	title,
	kicker,
	actions,
	children,
	className = "",
	bodyClassName = ""
}: {
	readonly title?: ReactNode;
	readonly kicker?: ReactNode;
	readonly actions?: ReactNode;
	readonly children: ReactNode;
	readonly className?: string;
	readonly bodyClassName?: string;
}) {
	return (
		<section className={`flex min-h-0 min-w-0 flex-col ${className}`}>
			{(title !== undefined || actions !== undefined) && (
				<header className="flex shrink-0 items-baseline justify-between gap-base px-loose pt-base pb-snug">
					<div className="min-w-0">
						{kicker !== undefined && <div className="text-meta text-neutral-400">{kicker}</div>}
						{title !== undefined && <h2 className="truncate text-heading text-text">{title}</h2>}
					</div>
					{actions !== undefined && <div className="flex shrink-0 items-center gap-snug">{actions}</div>}
				</header>
			)}
			<div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
		</section>
	);
}

/* ── Rows ─────────────────────────────────────────────────────────────────── */

/** A row in a list: no card, no border box — a hairline underneath and generous height. */
export function RowButton({
	children,
	onClick,
	href,
	selected = false,
	disabled = false,
	label
}: {
	readonly children: ReactNode;
	readonly onClick?: () => void;
	readonly href?: string;
	readonly selected?: boolean;
	readonly disabled?: boolean;
	readonly label?: string;
}) {
	const shell = `block w-full border-b border-rule-faint border-l-2 py-base pr-loose pl-loose text-left transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-55 ${
		selected ? "border-l-accent bg-accent-900/40" : "border-l-transparent hover:bg-ink-tint"
	}`;
	if (href !== undefined && !disabled)
		return (
			<Link href={href} className={shell} aria-label={label}>
				{children}
			</Link>
		);
	return (
		<button type="button" onClick={onClick} disabled={disabled} className={shell} aria-label={label}>
			{children}
		</button>
	);
}

export function RowHeading({
	title,
	chip,
	className = ""
}: {
	readonly title: ReactNode;
	readonly chip?: ReactNode;
	readonly className?: string;
}) {
	return (
		<div className={`flex items-baseline justify-between gap-base ${className}`}>
			<span className="min-w-0 shrink truncate text-[17px] leading-6 font-medium text-text">{title}</span>
			{chip}
		</div>
	);
}

/** A label/value pair, as the collector's review screen draws them. */
export function FieldRow({
	label,
	value,
	code,
	muted = false
}: {
	readonly label: ReactNode;
	readonly value: ReactNode;
	readonly code?: string;
	readonly muted?: boolean;
}) {
	return (
		<div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-x-base gap-y-hair border-b border-rule-faint py-snug">
			<div className="min-w-0">
				<div className="text-caption text-neutral-400">{label}</div>
				{code !== undefined && (
					<div className="text-micro text-neutral-600" translate="no">
						{code}
					</div>
				)}
			</div>
			<div
				className={`min-w-0 text-detail break-words ${muted ? "text-neutral-500 italic" : "text-neutral-200"}`}>
				{value}
			</div>
		</div>
	);
}

/* ── Footer ───────────────────────────────────────────────────────────────── */

/**
 * The last thing that happened, along the bottom edge — the collector's own footer. An accent dot,
 * one line, never a toast that disappears before it has been read.
 */
export function StatusFooter({ children }: { readonly children: ReactNode }) {
	return (
		<footer
			className="flex shrink-0 items-center gap-snug border-t border-edge px-loose py-tight"
			aria-live="polite">
			<span aria-hidden className="size-[5px] shrink-0 rounded-full bg-accent" />
			<span className="truncate text-micro text-neutral-500">{children}</span>
		</footer>
	);
}

/* ── Empty state ──────────────────────────────────────────────────────────── */

export function EmptyState({
	title,
	body,
	action
}: {
	readonly title: ReactNode;
	readonly body?: ReactNode;
	readonly action?: ReactNode;
}) {
	return (
		<div className="flex h-full flex-col items-start justify-center gap-base px-loose py-wide">
			<p className="text-question text-neutral-300">{title}</p>
			{body !== undefined && <p className="max-w-prose text-detail text-neutral-500">{body}</p>}
			{action}
		</div>
	);
}

/* ── Native elements that need the theme applied ──────────────────────────── */

export function Input({ className = "", ...rest }: ComponentPropsWithoutRef<"input">) {
	return (
		<input
			{...rest}
			className={`min-h-9 w-full rounded-md border border-rule bg-raised px-snug py-tight text-detail text-text caret-accent transition-colors duration-100 placeholder:text-neutral-600 hover:border-neutral-500 focus-visible:border-accent focus-visible:outline-offset-0 ${className}`}
		/>
	);
}
