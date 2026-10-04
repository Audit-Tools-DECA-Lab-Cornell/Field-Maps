import type { SetupState } from "./types";

const EXAMPLE = {
	orgName: "DECA Lab",
	orgSlug: "deca-lab",
	projectName: "Riverside Play Study",
	projectCode: "RPS",
	siteName: "Riverside Park playground"
} as const;

const EXPIRES_LABEL: Record<number, string> = { 7: "7 days", 30: "30 days", 90: "90 days" };
const FORM_LABEL: Record<string, string> = {
	"janet-test-v1": "janet-test-v1 (draft)",
	"shell-v1": "shell-v1 (published)"
};

/**
 * "What this creates" — the live tree beside the form. It fills in step by step: an item the
 * wizard has not reached yet stays faint, marked with the collector's own "waiting" glyph, so the
 * whole shape of what a finished set-up looks like is visible from the first field onward.
 */
export function PreviewPanel({
	state,
	stepIndex,
	finished
}: {
	readonly state: SetupState;
	readonly stepIndex: number;
	readonly finished: boolean;
}) {
	const orgName = state.orgName.trim() || EXAMPLE.orgName;
	const projectName = state.projectName.trim() || EXAMPLE.projectName;
	const projectCode = state.projectCode.trim() || EXAMPLE.projectCode;
	const siteName = state.siteName.trim() || EXAMPLE.siteName;
	const reached = (step: number) => finished || stepIndex >= step;

	return (
		<div className="rounded-lg border border-edge bg-surface p-loose">
			<p className="text-meta text-neutral-400">What this creates</p>
			<div className="mt-base flex flex-col gap-snug" role="tree" aria-label="What this sets up creates">
				<TreeRow depth={0} pending={false} label={orgName} meta="organization · you are owner" />
				<TreeRow
					depth={1}
					pending={!reached(1)}
					label={projectName}
					meta={`project · ${projectCode} · ${state.timezone}`}
				/>
				<TreeRow
					depth={2}
					pending={!reached(2)}
					label={`Site: ${siteName}`}
					meta="waiting for its QGIS package"
				/>
				<TreeRow depth={2} pending={!reached(3)} label="Form" meta={FORM_LABEL[state.formChoice]} />
				<TreeRow
					depth={2}
					pending={!reached(4)}
					label="Invitation"
					meta={`${state.inviteRole} · ${state.inviteUses} uses · ${EXPIRES_LABEL[state.inviteExpiresDays]}`}
				/>
			</div>
			<p className="mt-loose text-micro text-neutral-500">Preview only. Nothing here is saved yet.</p>
		</div>
	);
}

const INDENT: Record<0 | 1 | 2, string> = { 0: "ml-0", 1: "ml-loose", 2: "ml-wide" };

function TreeRow({
	depth,
	label,
	meta,
	pending
}: {
	readonly depth: 0 | 1 | 2;
	readonly label: string;
	readonly meta: string;
	readonly pending: boolean;
}) {
	return (
		<div
			role="treeitem"
			aria-selected={!pending}
			className={`flex min-w-0 items-baseline gap-tight ${INDENT[depth]}`}>
			{depth > 0 && (
				<span aria-hidden className="shrink-0 text-neutral-600">
					→
				</span>
			)}
			{pending && (
				<span aria-hidden className="shrink-0 text-neutral-600">
					◷
				</span>
			)}
			<span className={`min-w-0 truncate text-detail ${pending ? "text-neutral-600" : "text-neutral-200"}`}>
				{label}
				<span className={`ml-tight text-micro ${pending ? "text-neutral-700" : "text-neutral-500"}`}>
					· {meta}
				</span>
			</span>
		</div>
	);
}
