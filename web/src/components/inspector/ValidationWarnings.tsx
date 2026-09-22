import { Icon } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";

/** Non-blocking informational warnings shown on the parcel inspector. */
export function ValidationWarnings({ warnings }: { warnings: string[] }) {
	if (warnings.length === 0) return null;
	return (
		<Section title="Validation">
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				{warnings.map((text, i) => {
					const severe = /blocked|overlap|overdue/i.test(text);
					const color = severe ? "var(--red-fg)" : "var(--amber-fg)";
					return (
						<div
							key={i}
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: 8,
								fontSize: 12,
								color: "var(--text-2)"
							}}>
							<Icon name="warning" size={14} style={{ color, marginTop: 1 }} />
							<span>{text}</span>
						</div>
					);
				})}
			</div>
		</Section>
	);
}
