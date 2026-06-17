/** A titled block used inside the inspector and sidebar. */
export function Section({
	title,
	action,
	children,
	className = "",
	bodyClassName = ""
}: {
	title?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	bodyClassName?: string;
}) {
	return (
		<section className={`fo-section ${className}`} style={{ padding: "12px 14px" }}>
			{title && (
				<div className="fo-section-title" style={{ marginBottom: 8 }}>
					<span>{title}</span>
					{action}
				</div>
			)}
			<div className={bodyClassName}>{children}</div>
		</section>
	);
}

/** A standalone card surface. */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
	return <div className={`fo-panel ${className}`}>{children}</div>;
}
