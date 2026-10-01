/**
 * A small, rounded mock of the collector's own join screen, so the join code reads as something
 * that travels to a second device rather than as a value that only lives in this browser tab.
 */
export function PhoneJoinMock({
	code,
	projectName,
	orgName,
	role
}: {
	readonly code: string;
	readonly projectName: string;
	readonly orgName: string;
	readonly role: string;
}) {
	const cells = code.replace("-", "").padEnd(8, " ").split("");

	return (
		<div className="w-[196px] shrink-0 rounded-[26px] border border-rule bg-raised p-tight shadow-md" aria-hidden>
			<div className="flex flex-col gap-loose rounded-[18px] bg-bg px-base py-wide">
				<p className="text-center text-caption font-medium text-text">Join a project</p>
				<div className="grid grid-cols-4 gap-tight">
					{cells.map((char, index) => (
						<div
							key={index}
							className="tnum flex aspect-square items-center justify-center rounded-sm border border-rule bg-surface text-caption text-text">
							{char.trim()}
						</div>
					))}
				</div>
				<p className="text-center text-micro text-neutral-400">
					Join {projectName} ({orgName}) as {role}?
				</p>
			</div>
		</div>
	);
}
