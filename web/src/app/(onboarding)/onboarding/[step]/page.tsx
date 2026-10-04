import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { STEP_IDS } from "@/components/onboarding/types";
import { param, previewState, type SearchParams } from "@/features/auth/params";
import { isStepId, stepMeta } from "@/features/onboarding/steps";
import { StepScreen } from "@/features/onboarding/StepScreen";

type Params = Promise<{ step: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
	return STEP_IDS.map(step => ({ step }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
	const { step } = await params;
	if (!isStepId(step)) return {};
	return { title: `${stepMeta(step).title} · Set-up step ${STEP_IDS.indexOf(step) + 1} of ${STEP_IDS.length}` };
}

/**
 * One step of the first-workspace set-up (org-13). The answers live in this browser tab; nothing is sent.
 * `?preview-state=offline` shows the offline state.
 */
export default async function OnboardingStepPage({
	params,
	searchParams
}: {
	params: Params;
	searchParams: SearchParams;
}) {
	const { step } = await params;
	if (!isStepId(step)) notFound();
	const query = await searchParams;
	return <StepScreen key={step} step={step} offline={previewState(param(query["preview-state"])) === "offline"} />;
}
