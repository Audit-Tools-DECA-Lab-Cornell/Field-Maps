"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { PrimaryAction, SecondaryAction } from "@/components/nocturne/chrome";

import { FinishSummary } from "./FinishSummary";
import { PreviewPanel } from "./PreviewPanel";
import { InviteStep } from "./steps/InviteStep";
import { OrgStep } from "./steps/OrgStep";
import { ProjectStep } from "./steps/ProjectStep";
import { QuestionsStep } from "./steps/QuestionsStep";
import { SiteStep } from "./steps/SiteStep";
import { INITIAL_STATE, type SetupState, STEPS } from "./types";
import { generateJoinCode, isValidSlug } from "./utils";

/**
 * The manager's set-up journey (J1), as a clickable preview. Everything here lives in component
 * state: there is no tenancy API yet (BE-07), so finishing the flow can only describe what it
 * would create, not create it.
 */
export function SetupFlow() {
	const [state, setState] = useState<SetupState>(INITIAL_STATE);
	const [stepIndex, setStepIndex] = useState(0);
	const [finished, setFinished] = useState(false);
	const [joinCode, setJoinCode] = useState("");
	const headingRef = useRef<HTMLHeadingElement>(null);

	// Generated client-side only, after mount: a value from `crypto.getRandomValues` during server
	// rendering would not match what the client re-generates, and would mismatch on hydration, so it
	// cannot be computed during render.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setJoinCode(generateJoinCode());
	}, []);

	useEffect(() => {
		headingRef.current?.focus();
	}, [stepIndex, finished]);

	function patch(update: Partial<SetupState>) {
		setState(current => ({ ...current, ...update }));
	}

	function startAgain() {
		setState(INITIAL_STATE);
		setStepIndex(0);
		setFinished(false);
		setJoinCode(generateJoinCode());
	}

	const valid = isStepValid(stepIndex, state);

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (!valid) return;
		if (stepIndex === STEPS.length - 1) setFinished(true);
		else setStepIndex(current => current + 1);
	}

	return (
		<div className="flex flex-col gap-wide">
			<StepIndicator currentIndex={stepIndex} finished={finished} />

			<div className="grid grid-cols-1 gap-wide lg:grid-cols-2 lg:items-start">
				<section className="min-w-0">
					{finished ? (
						<>
							<h2 ref={headingRef} tabIndex={-1} className="text-question text-text outline-none">
								What&rsquo;s next
							</h2>
							<div className="mt-loose">
								<FinishSummary onStartAgain={startAgain} />
							</div>
						</>
					) : (
						<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-loose">
							<h2 ref={headingRef} tabIndex={-1} className="text-question text-text outline-none">
								{STEPS[stepIndex].label}
							</h2>

							{stepIndex === 0 && <OrgStep state={state} onChange={patch} />}
							{stepIndex === 1 && <ProjectStep state={state} onChange={patch} />}
							{stepIndex === 2 && <SiteStep state={state} onChange={patch} />}
							{stepIndex === 3 && <QuestionsStep state={state} onChange={patch} />}
							{stepIndex === 4 && (
								<InviteStep
									state={state}
									onChange={patch}
									joinCode={joinCode}
									onNewCode={() => setJoinCode(generateJoinCode())}
									projectName={state.projectName.trim() || "Riverside Play Study"}
									orgName={state.orgName.trim() || "DECA Lab"}
								/>
							)}

							<div className="mt-base flex items-center justify-between gap-base border-t border-rule-faint pt-loose">
								<SecondaryAction
									type="button"
									onClick={() => setStepIndex(current => Math.max(0, current - 1))}
									disabled={stepIndex === 0}>
									Back
								</SecondaryAction>
								<PrimaryAction type="submit" disabled={!valid}>
									Continue
								</PrimaryAction>
							</div>
						</form>
					)}
				</section>

				<aside className="min-w-0 lg:sticky lg:top-wide">
					<PreviewPanel state={state} stepIndex={stepIndex} finished={finished} />
				</aside>
			</div>
		</div>
	);
}

function isStepValid(stepIndex: number, state: SetupState): boolean {
	switch (stepIndex) {
		case 0:
			return state.orgName.trim() !== "" && isValidSlug(state.orgSlug);
		case 1:
			return state.projectName.trim() !== "" && state.projectCode.trim() !== "" && state.timezone !== "";
		case 2:
			return state.siteName.trim() !== "" && isValidSlug(state.siteCode);
		case 3:
			return true;
		case 4:
			return state.inviteUses >= 1;
		default:
			return true;
	}
}

/** Five numbered steps, the current one carrying an accent underline, completed ones a checkmark. */
function StepIndicator({ currentIndex, finished }: { readonly currentIndex: number; readonly finished: boolean }) {
	return (
		<ol className="flex flex-wrap gap-x-loose gap-y-snug">
			{STEPS.map((step, index) => {
				const completed = finished || index < currentIndex;
				const current = !finished && index === currentIndex;
				return (
					<li key={step.id} className="flex min-w-0 flex-col gap-tight">
						<span
							className={`flex items-center gap-tight text-caption ${
								current ? "text-text" : completed ? "text-neutral-300" : "text-neutral-600"
							}`}>
							<span
								aria-hidden
								className={`flex size-5 shrink-0 items-center justify-center rounded-full text-micro ${
									completed
										? "bg-accent-800 text-accent-200"
										: current
											? "border border-accent text-accent-200"
											: "border border-rule text-neutral-500"
								}`}>
								{completed ? "✓" : index + 1}
							</span>
							{step.label}
						</span>
						<span
							aria-hidden
							className={`h-[2px] rounded-full ${current ? "bg-accent" : "bg-transparent"}`}
						/>
					</li>
				);
			})}
		</ol>
	);
}
