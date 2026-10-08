"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useTransition } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";
import { STEP_IDS, type StepId } from "@/components/onboarding/types";
import { OfflineNote } from "@/features/auth/OfflineNote";

import { OnboardingFrame, ScreenHeading } from "./OnboardingFrame";
import {
	completeStep,
	firstOpenStep,
	isReachable,
	isStepValid,
	nextStep,
	previousStep,
	READY_HREF,
	skipStep,
	stepHref,
	stepMeta
} from "./steps";
import { FormStep } from "./steps/FormStep";
import { OrganizationStep } from "./steps/OrganizationStep";
import { ProjectStep } from "./steps/ProjectStep";
import { SiteStep } from "./steps/SiteStep";
import { TeamStep } from "./steps/TeamStep";
import { useSetup } from "./store";

/** Why Continue is off, said under it (DESIGN.md §5: a disabled control always carries its reason). */
const DISABLED_REASON: Record<StepId, string> = {
	organization: "Continue turns on once the organization has a name and a valid address.",
	project: "Continue turns on once the project has a name and a valid code.",
	site: "Continue turns on once the site has a name. Or skip this step and add a site later.",
	form: "",
	team: "Finish turns on when every address is complete. Remove a row you do not need."
};

export type StepScreenProps = {
	step: StepId;
	/** `?preview-state=offline` shows the offline state: answers stay in the tab and finishing is off. */
	offline?: boolean;
};

/**
 * One set-up step (org-13): its fields on the left, Back and Continue under them, and the workspace so far
 * on the right. Continue keeps the answers in this tab and moves on; the last step finishes, which in this
 * preview creates nothing and opens the summary that says so.
 */
export function StepScreen({ step, offline = false }: StepScreenProps) {
	const router = useRouter();
	const { toast } = useToast();
	const { state, update, hydrated } = useSetup();
	const [pending, startTransition] = useTransition();
	const reasonId = useId();

	const meta = stepMeta(step);
	const index = STEP_IDS.indexOf(step);
	const previous = previousStep(step);
	const next = nextStep(step);
	const last = next === null;
	const valid = isStepValid(step, state);
	const blockedOffline = last && offline;
	const canContinue = valid && !blockedOffline;

	// A step opened before the ones ahead of it are done (a typed URL, a bookmark) goes to the first open step.
	useEffect(() => {
		if (!hydrated || isReachable(step, state)) return;
		router.replace(stepHref(firstOpenStep(state) ?? "organization"));
		// Only on arrival: editing the current step never makes it unreachable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hydrated, step]);

	function finish() {
		toast({
			title: "Preview · Nothing was created",
			description: "Your answers stay in this browser tab until it closes."
		});
		startTransition(() => router.push(READY_HREF));
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!canContinue || pending) return;
		update(current => completeStep(current, step));
		if (last) finish();
		else startTransition(() => router.push(stepHref(next)));
	}

	function skip() {
		update(current => skipStep(current, step));
		if (last) finish();
	}

	const reason = blockedOffline
		? "Creating the workspace needs a connection. Your answers stay in this tab."
		: valid
			? undefined
			: DISABLED_REASON[step];

	return (
		<OnboardingFrame state={state} current={step}>
			<form noValidate onSubmit={submit} aria-labelledby="page-title" aria-busy={pending || undefined}>
				<ScreenHeading
					screen={step}
					kicker={`First workspace · Step ${index + 1} of ${STEP_IDS.length}`}
					title={meta.title}
					lead={meta.lead}
				/>

				<div className="mt-8 flex flex-col gap-6">
					{offline && (
						<OfflineNote>
							Your answers stay in this browser tab. Finishing the set-up needs a connection.
						</OfflineNote>
					)}
					{step === "organization" && <OrganizationStep state={state} update={update} />}
					{step === "project" && <ProjectStep state={state} update={update} />}
					{step === "site" && <SiteStep state={state} update={update} />}
					{step === "form" && <FormStep state={state} update={update} />}
					{step === "team" && <TeamStep state={state} update={update} />}
				</div>

				<div className="mt-8 flex flex-col gap-3">
					<div className="flex gap-3">
						{previous && (
							<ButtonLink href={stepHref(previous)} variant="outline" size="lg" icon="arrow-left">
								Back
							</ButtonLink>
						)}
						<Button
							type="submit"
							size="lg"
							iconRight="arrow-right"
							className="flex-1"
							disabled={!canContinue}
							busy={pending}
							aria-describedby={reason ? reasonId : undefined}>
							{last ? "Finish set-up" : "Continue"}
						</Button>
					</div>
					{reason && (
						<p id={reasonId} className="type-small text-ink-2">
							{reason}
						</p>
					)}
					{meta.optional && !blockedOffline && (
						<p className="type-body">
							<TextLink
								href={next ? stepHref(next) : READY_HREF}
								onClick={event => {
									if (last) event.preventDefault();
									skip();
								}}
								className="inline-flex min-h-touch items-center">
								Skip for now
							</TextLink>
						</p>
					)}
				</div>
			</form>
		</OnboardingFrame>
	);
}
