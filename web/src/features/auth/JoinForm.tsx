"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { Button } from "@/components/contour/Button";
import { CodeCounter } from "@/components/contour/CodeCounter";
import { CodeInput } from "@/components/contour/CodeInput";
import { Field } from "@/components/contour/Field";
import { TextLink } from "@/components/contour/TextLink";

import { isKnownJoinCode } from "./invitation";
import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, PREVIEW_HOME, withQuery } from "./params";

const CODE_LENGTH = 8;

export type JoinFormProps = {
	initialCode?: string;
	state: AuthPreviewState;
};

/**
 * Join a project by code (Org 12, PROPOSAL U3). The code is uppercased as it is typed. A known code opens
 * the invitation screen, where the person sees the project before joining; nothing is joined here.
 */
export function JoinForm({ initialCode = "", state }: JoinFormProps) {
	const router = useRouter();
	const [code, setCode] = useState(initialCode);
	const [error, setError] = useState<string>();
	const [pending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);
	const offline = state === "offline";

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || offline) return;
		const message =
			code.length < CODE_LENGTH
				? "Enter all eight characters of the code."
				: !isKnownJoinCode(code)
					? "We could not find a project for that code. Check it with your coordinator."
					: undefined;
		if (message) {
			setError(message);
			requestAnimationFrame(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			});
			return;
		}
		startTransition(() => router.push(withQuery("/invite", { code })));
	}

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending || undefined}>
			{offline && <OfflineNote />}
			<Field
				label="Project join code"
				htmlFor="join-code"
				hint="Letters and numbers, no spaces."
				error={error}
				counter={<CodeCounter value={code} length={CODE_LENGTH} />}>
				<CodeInput
					ref={inputRef}
					id="join-code"
					name="code"
					length={CODE_LENGTH}
					kind="join"
					value={code}
					autoFocus
					onChange={value => {
						setCode(value);
						setError(undefined);
					}}
				/>
			</Field>
			<Button
				type="submit"
				size="lg"
				fullWidth
				iconRight="arrow-right"
				busy={pending}
				disabled={offline}
				disabledReason="Finding a project needs a connection.">
				Preview project
			</Button>
			<p className="-mt-2.5 type-body">
				<TextLink href={PREVIEW_HOME} arrow={false} className="inline-flex min-h-touch items-center">
					Skip for now
				</TextLink>
			</p>
		</form>
	);
}
