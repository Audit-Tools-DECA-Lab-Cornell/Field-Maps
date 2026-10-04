import type { ReactNode } from "react";

import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";
import type { SetupState, StepId } from "@/components/onboarding/types";
import { WORKSPACE_HOST } from "@/components/onboarding/utils";
import { cx } from "@/lib/cx";

import { filledInvites, isSettled, STEPS } from "./steps";

type RowState = "done" | "skipped" | "current" | "upcoming";

/** The island's line for a done step, filled in from the answers. */
function answerLine(id: StepId, state: SetupState): ReactNode {
	switch (id) {
		case "organization":
			return (
				<>
					{state.orgName.trim()} ·{" "}
					<Mono className="wrap-anywhere">{`${WORKSPACE_HOST}/o/${state.orgSlug}`}</Mono>
				</>
			);
		case "project":
			return (
				<>
					{state.projectName.trim()} · <Mono>{state.projectCode}</Mono> · <Mono>{state.timezone}</Mono>
				</>
			);
		case "site":
			return `${state.siteName.trim()} · its QGIS package comes later, from Sites`;
		case "form":
			return state.formChoice === "demo" ? (
				<>
					A new draft from the demonstration form, <Mono>demo-v1</Mono>.
				</>
			) : (
				"An empty draft, with no questions yet."
			);
		case "team": {
			const count = filledInvites(state).length;
			const people = count === 0 ? "No invitations yet" : count === 1 ? "1 invitation" : `${count} invitations`;
			return (
				<>
					{people} · observer join code <Mono>{state.joinCode}</Mono>
				</>
			);
		}
	}
}

const SKIPPED_LINE: Partial<Record<StepId, string>> = {
	site: "Skipped. Add a site later from Sites.",
	form: "Skipped. Create a form later from Forms.",
	team: "Skipped. Invite people later from Team."
};

function Marker({ state, number }: { state: RowState; number: number }) {
	if (state === "done")
		return (
			<span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-saved-soft text-saved">
				<Icon name="check" size={16} />
			</span>
		);
	return (
		<span
			className={cx(
				"flex size-8 shrink-0 items-center justify-center rounded-pill type-small font-semibold tnum",
				state === "current" ? "bg-ink text-on-ink" : "border border-ink-2 text-ink-2"
			)}>
			{number}
		</span>
	);
}

const STATUS: Record<RowState, string> = {
	done: "font-semibold text-saved",
	skipped: "text-ink-2",
	current: "font-semibold text-ink",
	upcoming: "text-ink-2"
};

export type WorkspaceSoFarProps = {
	state: SetupState;
	/** The step on screen, or null on the summary. */
	current: StepId | null;
	className?: string;
};

/**
 * "Your workspace so far" (org-13): the five steps with where each one stands. A done step shows its
 * answers, so the person can see what finishing would create while they go.
 */
export function WorkspaceSoFar({ state, current, className }: WorkspaceSoFarProps) {
	return (
		<Island as="section" aria-labelledby="workspace-so-far" className={className}>
			<h2 id="workspace-so-far" className="border-b border-rule pb-4 type-mono-label text-ink-2">
				Your workspace so far
			</h2>
			<ol>
				{STEPS.map((step, index) => {
					const rowState: RowState =
						step.id === current
							? "current"
							: state.skipped.includes(step.id)
								? "skipped"
								: isSettled(step.id, state)
									? "done"
									: "upcoming";
					const status =
						rowState === "done"
							? "Done"
							: rowState === "skipped"
								? "Skipped"
								: rowState === "current"
									? "You are here"
									: step.optional
										? "Optional"
										: "Required";
					const line =
						rowState === "done"
							? answerLine(step.id, state)
							: rowState === "skipped"
								? (SKIPPED_LINE[step.id] ?? step.summary)
								: step.summary;

					return (
						<li
							key={step.id}
							aria-current={rowState === "current" ? "step" : undefined}
							className="flex items-start gap-3 border-b border-rule py-4 last:border-b-0 last:pb-0">
							<Marker state={rowState} number={index + 1} />
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
									<h3 className="type-body font-semibold text-ink">
										<span className="sr-only">Step {index + 1}, </span>
										{step.label}
									</h3>
									<span className={cx("type-small", STATUS[rowState])}>{status}</span>
								</div>
								<p className="type-body text-ink-2">{line}</p>
							</div>
						</li>
					);
				})}
			</ol>
		</Island>
	);
}
