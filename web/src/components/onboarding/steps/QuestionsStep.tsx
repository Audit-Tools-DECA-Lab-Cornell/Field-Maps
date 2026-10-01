"use client";

import { LinkAction } from "@/components/nocturne/chrome";

import type { FormChoice, SetupState } from "../types";

const FORMS: readonly {
	readonly id: FormChoice;
	readonly name: string;
	readonly code: string;
	readonly meta: string;
}[] = [
	{ id: "janet-test-v1", name: "Janet's test subset", code: "janet-test-v1", meta: "12 questions · draft" },
	{ id: "shell-v1", name: "Practice form", code: "shell-v1", meta: "3 questions · published" }
];

export function QuestionsStep({
	state,
	onChange
}: {
	readonly state: SetupState;
	readonly onChange: (patch: Partial<SetupState>) => void;
}) {
	return (
		<div className="flex flex-col gap-loose">
			<fieldset className="m-0 flex flex-col gap-tight border-0 p-0">
				<legend className="mb-tight text-meta text-neutral-400">Starting form</legend>
				{FORMS.map(form => (
					<label
						key={form.id}
						className={`flex min-h-11 cursor-pointer items-start gap-snug rounded-md border-l-2 px-snug py-tight ${
							state.formChoice === form.id
								? "border-l-accent-400 bg-accent-800"
								: "border-l-transparent bg-neutral-900 hover:bg-neutral-800"
						}`}>
						<input
							type="radio"
							name="form-choice"
							value={form.id}
							checked={state.formChoice === form.id}
							onChange={() => onChange({ formChoice: form.id })}
							className="mt-[3px] size-[15px] shrink-0 accent-[var(--color-accent)]"
						/>
						<span className="min-w-0">
							<span className="block text-detail text-text">{form.name}</span>
							<span className="block text-micro text-neutral-500" translate="no">
								{form.code} · {form.meta}
							</span>
						</span>
					</label>
				))}
			</fieldset>

			<LinkAction href="/instrument">Open the Form Studio</LinkAction>

			<p className="text-micro text-neutral-500">Published versions never change; edits start a new draft.</p>
		</div>
	);
}
