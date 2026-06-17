"use client";

import type { IconName } from "@/components/shared/Icon";
import { Icon } from "@/components/shared/Icon";
import { useOperationsStore } from "@/state/useOperationsStore";

const toneColor: Record<string, string> = {
	info: "var(--blue)",
	success: "var(--green)",
	warning: "var(--amber)",
	error: "var(--red)"
};

const toneIcon: Record<string, IconName> = {
	info: "info",
	success: "check-circle",
	warning: "warning",
	error: "error"
};

export function Toaster() {
	const toasts = useOperationsStore(s => s.toasts);
	const dismissToast = useOperationsStore(s => s.dismissToast);

	return (
		<div
			style={{
				position: "fixed",
				right: 16,
				bottom: 16,
				zIndex: 2000,
				display: "flex",
				flexDirection: "column",
				gap: 8,
				maxWidth: 360
			}}>
			{toasts.map(t => (
				<div key={t.id} className="fo-toast" onClick={() => dismissToast(t.id)} role="status">
					<span style={{ color: toneColor[t.tone] }}>
						<Icon name={toneIcon[t.tone]} size={16} />
					</span>
					<span>{t.message}</span>
				</div>
			))}
		</div>
	);
}
