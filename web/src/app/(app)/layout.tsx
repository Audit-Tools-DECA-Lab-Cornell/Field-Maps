import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/contour/Toast";
import { TooltipProvider } from "@/components/contour/Tooltip";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { PreviewFooter } from "@/components/shell/PreviewFooter";
import { RouteFocus } from "@/components/shell/RouteFocus";
import { ShortcutsDialog } from "@/components/shell/ShortcutsDialog";
import { SkipLink } from "@/components/shell/SkipLink";
import { FlashToast } from "@/features/shell/FlashToast";
import { PreviewProvider } from "@/features/shell/PreviewProvider";
import { ShellProvider } from "@/features/shell/ShellProvider";
import { ThemeKeeper } from "@/features/shell/ThemeKeeper";
import { ShellKeys } from "@/features/shell/useShortcuts";

export const metadata: Metadata = {
	robots: { index: false, follow: false }
};

/**
 * Every workspace page: the preview layer, tooltips, toasts, the ⌘K palette, the shortcuts and their
 * dialog, focus on navigation, the skip link and the Preview data footer line. The header and tabs come
 * from the layouts inside, which know the organization and project.
 */
export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<PreviewProvider>
			<TooltipProvider>
				<ToastProvider>
					<ShellProvider>
						<div className="relative flex min-h-dvh flex-col bg-ground">
							<SkipLink />
							{children}
							<PreviewFooter />
						</div>
						<CommandPalette />
						<ShortcutsDialog />
						<ShellKeys />
						<RouteFocus />
						<FlashToast />
						<ThemeKeeper />
					</ShellProvider>
				</ToastProvider>
			</TooltipProvider>
		</PreviewProvider>
	);
}
