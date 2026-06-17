const STEPS = [
	"Select a parcel",
	"Review inspection history",
	"Edit attributes or boundary",
	"Save changes locally",
	"Sync to operations system"
];

export function EmptyInspector() {
	return (
		<div style={{ padding: "20px 16px" }}>
			<h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>No parcel selected</h2>
			<p
				style={{
					margin: "6px 0 0",
					fontSize: 12.5,
					color: "var(--text-2)",
					lineHeight: 1.5
				}}>
				Select a parcel or field asset to review details, inspections, and pending changes.
			</p>

			<div className="fo-kicker" style={{ marginTop: 22, marginBottom: 10 }}>
				Workflow
			</div>
			<ol
				style={{
					listStyle: "none",
					margin: 0,
					padding: 0,
					display: "flex",
					flexDirection: "column",
					gap: 10
				}}>
				{STEPS.map((label, i) => (
					<li key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								width: 22,
								height: 22,
								borderRadius: 99,
								background: "var(--accent-tint)",
								color: "var(--accent)",
								fontSize: 11.5,
								fontWeight: 700,
								flex: "none"
							}}>
							{i + 1}
						</span>
						<span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{label}</span>
					</li>
				))}
			</ol>
		</div>
	);
}
