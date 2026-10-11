import { cx } from "@/lib/cx";

export type AvatarProps = {
	/** One to three letters, as the person's observer code or name gives them ("PS"). */
	initials: string;
	/** ink: the signed-in account in the header. well: people in lists and tables. */
	tone?: "ink" | "well";
	/** sm 32 px (rows), md 40 px, lg 44 px (the header account button). */
	size?: "sm" | "md" | "lg";
	/**
	 * Name the avatar only when no name is written beside it and it is not inside a labelled control.
	 * Otherwise it is hidden from assistive technology, so the initials are not read twice.
	 */
	label?: string;
	className?: string;
};

const SIZE = {
	sm: "size-8 text-xs",
	md: "size-10 text-sm",
	lg: "size-11 text-base"
} as const;

const TONE = {
	ink: "bg-ink text-on-ink",
	well: "bg-well text-ink"
} as const;

/** A person's initials in a circle. DECA Mark shows no photos. */
export function Avatar({ initials, tone = "well", size = "md", label, className }: AvatarProps) {
	return (
		<span
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			className={cx(
				"inline-flex shrink-0 select-none items-center justify-center rounded-pill font-sans font-semibold leading-none",
				SIZE[size],
				TONE[tone],
				className
			)}>
			{initials}
		</span>
	);
}
