"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

/** Hover time before a tooltip opens. Keyboard focus opens it at once. */
const OPEN_DELAY = 400;

/** Shares the open delay across tooltips. Place it once, in the root layout. */
export function TooltipProvider({ children }: { children: ReactNode }) {
	return <TooltipPrimitive.Provider delayDuration={OPEN_DELAY}>{children}</TooltipPrimitive.Provider>;
}

export type TooltipProps = {
	/** A few words. Never something the reader needs: a disabled reason is a visible line, not a tooltip. */
	content: ReactNode;
	/** One element that takes focus and a ref, such as a Button or IconButton. */
	children: ReactElement;
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
};

/** A small ink label that names a control on hover or focus, and fades over the quick duration. */
export function Tooltip({ content, children, side = "top", align = "center" }: TooltipProps) {
	return (
		<TooltipPrimitive.Root>
			<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content
					side={side}
					align={align}
					sideOffset={8}
					collisionPadding={16}
					className="z-50 max-w-xs rounded-input bg-ink px-2.5 py-1.5 type-small text-on-ink data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-fade-in data-[state=instant-open]:animate-fade-in">
					{content}
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
}
