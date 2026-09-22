export function FieldRow({
	label,
	children,
	mono = false
}: {
	label: string;
	children: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="fo-field">
			<div className="fo-field-label">{label}</div>
			<div className={`fo-field-value ${mono ? "fo-mono" : ""}`}>{children}</div>
		</div>
	);
}
