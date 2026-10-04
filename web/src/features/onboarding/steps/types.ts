import type { SetupState } from "@/components/onboarding/types";

import type { SetupUpdate } from "../store";

/** What every step's fields take: the answers and a way to change them. */
export type StepBodyProps = {
	state: SetupState;
	update: (change: SetupUpdate) => void;
};
