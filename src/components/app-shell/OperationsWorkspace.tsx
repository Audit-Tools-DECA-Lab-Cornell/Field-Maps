"use client";

import { BottomOperationsPanel } from "@/components/bottom-panel/BottomOperationsPanel";
import { RightInspector } from "@/components/inspector/RightInspector";
import { MapWorkspace } from "@/components/map/MapWorkspace";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { useOperationsStore } from "@/state/useOperationsStore";

import { MobileGate } from "./MobileGate";
import { ThemeController } from "./ThemeController";
import { Toaster } from "./Toaster";
import { TopBar } from "./TopBar";

export function OperationsWorkspace() {
	const collapsed = useOperationsStore(s => s.bottomPanelCollapsed);

	return (
		<>
			<ThemeController />
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: "100vh",
					overflow: "hidden",
					background: "var(--bg)"
				}}>
				<TopBar />

				<div style={{ flex: 1, display: "flex", minHeight: 0 }}>
					<aside style={{ width: 324, flexShrink: 0, minHeight: 0 }}>
						<LeftSidebar />
					</aside>

					<main style={{ flex: 1, minWidth: 0, position: "relative" }}>
						<MapWorkspace />
					</main>

					<aside style={{ width: 412, flexShrink: 0, minHeight: 0 }}>
						<RightInspector />
					</aside>
				</div>

				<div
					style={{
						height: collapsed ? 41 : 236,
						flexShrink: 0,
						borderTop: "1px solid var(--border)",
						background: "var(--surface)",
						overflow: "hidden"
					}}>
					<BottomOperationsPanel />
				</div>

				<Toaster />
			</div>
			<MobileGate />
		</>
	);
}
