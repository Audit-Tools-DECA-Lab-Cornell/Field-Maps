import { cx } from "@/lib/cx";

export type SkeletonProps = {
	/** Height and width of the bar. Without a class it draws a 12 px bar across its container. */
	className?: string;
};

/**
 * A still placeholder bar in the well colour, laid out like the content it stands in for. It never
 * shimmers or pulses (system-06); ScreenState delays the whole set so a fast load shows nothing.
 */
export function Skeleton({ className }: SkeletonProps) {
	return <span aria-hidden="true" className={cx("block rounded-pill bg-well", className ?? "h-3 w-full")} />;
}
