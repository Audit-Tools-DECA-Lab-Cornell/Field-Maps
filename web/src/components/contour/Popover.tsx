"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cx } from "@/lib/cx";

import { MENU_SURFACE, OVERLAY_MOTION } from "./classes";

/** The popover root. Esc and a press outside close it; focus returns to the trigger. */
export const Popover = PopoverPrimitive.Root;

/** Opens the popover. Render your button through it: `<PopoverTrigger asChild><Button …/></PopoverTrigger>`. */
export const PopoverTrigger = PopoverPrimitive.Trigger;

/** Places the popover against an element other than its trigger. */
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverClose = PopoverPrimitive.Close;

/**
 * Free content on the menu surface, such as the Preview data note. Up to 320 px wide; text wraps
 * inside it.
 */
export function PopoverContent({
	className,
	sideOffset = 8,
	collisionPadding = 16,
	...rest
}: ComponentPropsWithRef<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				sideOffset={sideOffset}
				collisionPadding={collisionPadding}
				{...rest}
				className={cx(
					MENU_SURFACE,
					"z-50 max-w-80 p-4 type-body",
					"origin-(--radix-popover-content-transform-origin)",
					OVERLAY_MOTION,
					className
				)}
			/>
		</PopoverPrimitive.Portal>
	);
}
