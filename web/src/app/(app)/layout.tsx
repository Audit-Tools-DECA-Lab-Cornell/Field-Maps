import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/contour/Toast";
import { TooltipProvider } from "@/components/contour/Tooltip";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { RouteFocus } from "@/components/shell/RouteFocus";
import { ShortcutsDialog } from "@/components/shell/ShortcutsDialog";
import { SkipLink } from "@/components/shell/SkipLink";
import { FlashToast } from "@/features/shell/FlashToast";
import { PreviewProvider } from "@/features/shell/PreviewProvider";
import { ShellProvider } from "@/features/shell/ShellProvider";
import { ThemeKeeper } from "@/features/shell/ThemeKeeper";
import { ShellKeys } from "@/features/shell/useShortcuts";
import { WorkspaceProvider } from "@/features/shell/WorkspaceProvider";
import { getWorkspace } from "@/lib/api/workspace";

export const metadata: Metadata = {
	robots: { index: false, follow: false }
};

/**
 * Every workspace page: the signed-in person's workspace (who they are, their organizations and projects,
 * read once per request), tooltips, toasts, the ⌘K palette, the shortcuts and their dialog, focus on
 * navigation and the skip link. The header and tabs come from the layouts inside, which know the
 * organization and project.
 *
 * PreviewProvider is a temporary shim for the screens not yet moved to live data; nothing in the shell
 * reads it.
 */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
	const workspace = await getWorkspace();
	return (
		<WorkspaceProvider value={workspace}>
			<PreviewProvider>
				<TooltipProvider>
					<ToastProvider>
						<ShellProvider>
							<div className="relative flex min-h-dvh flex-col bg-ground">
								<SkipLink />
								{children}
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
		</WorkspaceProvider>
	);
}
