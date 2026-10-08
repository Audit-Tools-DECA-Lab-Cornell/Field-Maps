"use client";

import type { ComponentPropsWithRef } from "react";

import { cx } from "@/lib/cx";

import { controlFrame } from "./classes";
import { useFieldControl } from "./Field";
import { Icon } from "./Icon";

export type SelectProps = ComponentPropsWithRef<"select"> & {
	/** Draws the attention edge and sets aria-invalid. Inside a Field, an error does this already. */
	invalid?: boolean;
};

/**
 * The native select in the Contour frame, with a chevron in place of the platform arrow. Native, so the
 * phone's own picker opens on touch. `className` sizes and places it (it lands on the wrapper); every
 * other prop reaches the <select>.
 */
export function Select({
	ref,
	invalid,
	className,
	id,
	"aria-describedby": describedBy,
	children,
	...props
}: SelectProps) {
	const field = useFieldControl({ id, invalid, describedBy });

	return (
		<div className={cx("relative", className)}>
			<select
				ref={ref}
				id={field.id}
				aria-invalid={field.invalid || undefined}
				aria-describedby={field.describedBy}
				className={cx(
					"peer",
					controlFrame({ invalid: field.invalid }),
					"h-control cursor-pointer appearance-none pr-11 pl-4 text-base"
				)}
				{...props}>
				{children}
			</select>
			<Icon
				name="chevron-down"
				className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink peer-disabled:opacity-50"
			/>
		</div>
	);
}
