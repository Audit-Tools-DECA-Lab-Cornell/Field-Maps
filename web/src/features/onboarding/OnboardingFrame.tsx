"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { StepBar } from "@/components/contour/StepBar";
import { type SetupState, STEP_IDS, type StepId } from "@/components/onboarding/types";

import { isReachable, isSettled, stepHref, STEPS } from "./steps";
import { WorkspaceSoFar } from "./WorkspaceSoFar";

/* The screen shown last in this tab. Focus moves to the new title only when the person moves between
   screens, not on the first load, where the skip link and the page order come first. */
let lastScreen: string | null = null;

/** Focuses the title when the screen changes. Returns the ref for the <h1>. */
export function useTitleFocus(screen: string) {
	const ref = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		if (lastScreen !== null && lastScreen !== screen) ref.current?.focus();
		lastScreen = screen;
	}, [screen]);
	return ref;
}

export type ScreenHeadingProps = {
	screen: string;
	kicker: ReactNode;
	title: ReactNode;
	lead?: ReactNode;
};

/** The eyebrow, the auth-size title and the lead that open every set-up screen. */
export function ScreenHeading({ screen, kicker, title, lead }: ScreenHeadingProps) {
	const ref = useTitleFocus(screen);
	return (
		<>
			<p className="type-mono-label text-ink-2">{kicker}</p>
			<h1 ref={ref} id="page-title" tabIndex={-1} className="mt-3 type-page text-ink outline-none sm:type-auth">
				{title}
			</h1>
			{lead != null && <p className="mt-3 type-lead text-ink-2">{lead}</p>}
		</>
	);
}

export type OnboardingFrameProps = {
	state: SetupState;
	/** The step on screen, or null on the summary. */
	current: StepId | null;
	children: ReactNode;
};

/**
 * The set-up frame (org-13): the step bar across the page, then the step on the left and "Your
 * workspace so far" on the right. Below 1024 px the island follows the step.
 */
export function OnboardingFrame({ state, current, children }: OnboardingFrameProps) {
	const done = STEP_IDS.filter(id => id !== current && isSettled(id, state) && isReachable(id, state));

	return (
		<div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-8 px-4 pt-4 pb-14 md:px-gutter lg:gap-10 xl:px-23">
			<StepBar
				label="Set-up steps"
				steps={STEPS.map(step => ({ key: step.id, label: step.label, href: stepHref(step.id) }))}
				current={current ?? ""}
				done={done}
			/>
			<div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
				<div className="w-full max-w-130 min-w-0 lg:w-110 lg:shrink-0 xl:w-130">{children}</div>
				<WorkspaceSoFar state={state} current={current} className="w-full max-w-130 lg:max-w-none lg:flex-1" />
			</div>
		</div>
	);
}
