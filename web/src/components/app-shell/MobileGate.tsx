import { Icon } from "@/components/shared/Icon";

/** Shown only below 1024px (via CSS). This prototype is desktop-only. */
export function MobileGate() {
	return (
		<div className="fo-mobile-gate">
			<div className="fo-mobile-card">
				<span
					style={{
						display: "grid",
						placeItems: "center",
						width: 52,
						height: 52,
						margin: "0 auto 16px",
						borderRadius: 14,
						background: "var(--accent)",
						color: "var(--accent-contrast)"
					}}>
					<Icon name="boundary" size={28} />
				</span>
				<span className="fo-badge is-purple fo-badge--square" style={{ marginBottom: 12 }}>
					Prototype
				</span>
				<h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 750 }}>Best viewed on desktop</h1>
				<p
					style={{
						margin: 0,
						fontSize: 13.5,
						lineHeight: 1.55,
						color: "var(--text-2)"
					}}>
					<b>FieldMaps Parcel Editor</b> is a dense field-operations workspace — a map, parcel inspector,
					filters, and a sync queue side by side. It is designed for a desktop screen and is not optimized for
					mobile.
				</p>
				<p
					style={{
						margin: "14px 0 0",
						fontSize: 12,
						color: "var(--text-3)"
					}}>
					Please reopen this on a screen at least 1024px wide.
				</p>
			</div>
		</div>
	);
}
