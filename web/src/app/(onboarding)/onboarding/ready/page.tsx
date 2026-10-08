import type { Metadata } from "next";

import { ReadySummary } from "@/features/onboarding/ReadySummary";

export const metadata: Metadata = {
	title: "Your workspace is ready · Set-up preview"
};

/** The end of the set-up: what finishing would create, and that this preview created nothing. */
export default function OnboardingReadyPage() {
	return <ReadySummary />;
}
