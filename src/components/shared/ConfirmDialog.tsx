"use client";

import { Button } from "./Button";

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	danger = false,
	onConfirm,
	onCancel
}: {
	open: boolean;
	title: string;
	message: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	if (!open) return null;
	return (
		<div
			role="dialog"
			aria-modal="true"
			onClick={onCancel}
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(15,23,42,0.4)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000
			}}>
			<div
				className="fo-panel"
				onClick={e => e.stopPropagation()}
				style={{ width: 360, padding: 18, boxShadow: "var(--shadow-lg)" }}>
				<h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>{title}</h3>
				<div style={{ color: "var(--text-2)", fontSize: 12.5, marginBottom: 16 }}>{message}</div>
				<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
					<Button variant="subtle" onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
