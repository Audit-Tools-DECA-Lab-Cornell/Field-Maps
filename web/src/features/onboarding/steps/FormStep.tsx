"use client";

import { Mono } from "@/components/contour/Mono";
import { Note } from "@/components/contour/Note";
import { RadioRows } from "@/components/contour/RadioRows";
import type { FormChoice } from "@/components/onboarding/types";
import { PROJECT_FORMS } from "@/fixtures";

import type { StepBodyProps } from "./types";

const DEMONSTRATION = PROJECT_FORMS.find(form => form.slug === "demonstration");
const QUESTIONS = DEMONSTRATION?.questions.total ?? 0;

/** Step 4: the form the project starts with. Either way it is a draft until a version is published. */
export function FormStep({ state, update }: StepBodyProps) {
	return (
		<>
			<fieldset className="flex flex-col gap-3">
				<legend className="mb-2 type-small font-semibold text-ink">Starting form</legend>
				<RadioRows
					label="Starting form"
					name="form"
					value={state.formChoice}
					onValueChange={value => update({ formChoice: value as FormChoice })}
					options={[
						{
							value: "demo",
							label: "Start from the demonstration form",
							description: (
								<>
									A new draft based on <Mono>demo-v1</Mono>, with {QUESTIONS} questions to adapt to
									your protocol.
								</>
							)
						},
						{
							value: "empty",
							label: "Start with an empty draft",
							description: "Add questions one at a time in the form editor."
						}
					]}
				/>
			</fieldset>
			<Note>
				Published versions never change. Edits after publishing start a new draft, so earlier observations keep
				the meaning they were collected with.
			</Note>
		</>
	);
}
