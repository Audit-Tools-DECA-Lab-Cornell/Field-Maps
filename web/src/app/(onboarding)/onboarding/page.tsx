import { redirect } from "next/navigation";

import { stepHref } from "@/features/onboarding/steps";

/** The set-up starts at its first step. */
export default function OnboardingPage() {
	redirect(stepHref("organization"));
}
