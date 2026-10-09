"use client";

import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { CodeCounter } from "@/components/contour/CodeCounter";
import { CodeInput } from "@/components/contour/CodeInput";
import { Field } from "@/components/contour/Field";
import { Note } from "@/components/contour/Note";
import { TextLink } from "@/components/contour/TextLink";

import { previewInvite } from "./actions";
import { type InvitationDetails, type InviteProblem, type PreviewOutcome, UNREACHABLE_COPY } from "./invitation";
import { formatCountdown, useCooldown } from "./useCooldown";

const CODE_LENGTH = 8;

export type JoinFormProps = {
	/** The code as it was when the person went back to change it. */
	code: string;
	onCodeChange: (code: string) => void;
	/** FieldMaps found the invitation: the screen shows it with Join. */
	onFound: (invitation: InvitationDetails) => void;
};

/**
 * Join a project by code (Org 12). The code is uppercased as it is typed and goes to FieldMaps in the body
 * of the request, never in an address. A code FieldMaps knows opens the invitation, where the person sees
 * the project before joining; nothing is joined here. A code that does not match anything is a plain
 * message beside the field; too many tries turns the button off for as long as FieldMaps says.
 */
export function JoinForm({ code, onCodeChange, onFound }: JoinFormProps) {
	const [error, setError] = useState<string>();
	const [note, setNote] = useState<InviteProblem>();
	const [pending, setPending] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const cooldown = useCooldown();
	const waiting = cooldown.remaining > 0;

	function refocus() {
		requestAnimationFrame(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		});
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || waiting) return;
		setNote(undefined);
		if (code.length < CODE_LENGTH) {
			setError("Enter all eight characters of the code.");
			refocus();
			return;
		}
		setPending(true);
		let outcome: PreviewOutcome;
		try {
			outcome = await previewInvite({ code });
		} catch {
			outcome = { status: "failed", problem: { kind: "unavailable", message: UNREACHABLE_COPY } };
		}
		if (outcome.status === "ready") {
			onFound(outcome.invitation);
			return;
		}
		setPending(false);
		const { problem } = outcome;
		if (problem.kind === "invalid" || problem.kind === "expired") {
			setError(problem.message);
			refocus();
		} else {
			if (problem.kind === "wait") cooldown.start(problem.retryAfter ?? 60);
			setNote(problem);
		}
	}

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending || undefined}>
			{note && (
				<Note tone={note.kind === "wait" ? "waiting" : "attention"} live="assertive">
					{note.message}
				</Note>
			)}
			<Field
				label="Join code"
				htmlFor="join-code"
				hint="Letters and numbers, no spaces."
				error={error}
				counter={<CodeCounter value={code} length={CODE_LENGTH} />}>
				<CodeInput
					ref={inputRef}
					id="join-code"
					length={CODE_LENGTH}
					kind="join"
					value={code}
					autoFocus
					invalid={error ? true : undefined}
					onChange={value => {
						onCodeChange(value);
						setError(undefined);
					}}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				size="lg"
				fullWidth
				iconRight="arrow-right"
				busy={pending}
				busyLabel="Finding the project…"
				disabled={waiting}
				disabledReason={`Wait ${formatCountdown(cooldown.remaining)} before trying again.`}>
				Find the project
			</Button>
			<p className="-mt-2.5 type-body">
				<TextLink href="/o" arrow={false} className="inline-flex min-h-touch items-center">
					Back to your projects
				</TextLink>
			</p>
		</form>
	);
}
