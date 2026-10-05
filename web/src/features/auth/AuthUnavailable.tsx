import { ButtonLink } from "@/components/contour/Button";
import { Note } from "@/components/contour/Note";
import { TextLink } from "@/components/contour/TextLink";
import { previewBypassAllowed } from "@/lib/auth/preview";
import { supabaseConfig } from "@/lib/supabase/config";

import { type AuthPreviewState, previewState } from "./params";

/** Where a development or review build without Supabase opens the sample workspace (D23). */
const SAMPLE_WORKSPACE = "/o/deca";

/**
 * How a signed-out auth page renders. `form` is false when this server has no Supabase configuration
 * and no preview state was asked for, so the page shows NotConfigured in place of a form that could not
 * work. `?preview-state=` demos are honoured only where previews may bypass sign-in (D23): development and
 * review builds without Supabase.
 */
export function authPageMode(value: string | string[] | undefined): { form: boolean; preview: AuthPreviewState } {
	const preview = previewBypassAllowed() ? previewState(value) : "normal";
	return { form: supabaseConfig() !== null || preview !== "normal", preview };
}

/** What an auth page shows when sign-in cannot work on this server. */
export function NotConfigured() {
	return (
		<div className="flex flex-col gap-5">
			<Note tone="attention" title="Sign-in is not configured on this server.">
				Ask the operator to set the public Supabase URL and publishable key.
			</Note>
			{previewBypassAllowed() && (
				<p className="type-body">
					<TextLink href={SAMPLE_WORKSPACE} className="inline-flex min-h-touch items-center">
						Open the sample workspace
					</TextLink>
				</p>
			)}
		</div>
	);
}

export type StartAgainProps = {
	/** Where the person enters their address again. */
	href: string;
	/** What did not happen, for the note's second sentence: "Nothing was verified." */
	nothing: string;
};

/**
 * A code page opened without the address its code went to: the server keeps that address in an httpOnly
 * cookie for 30 minutes, so it has expired, or the flow began in another browser.
 */
export function StartAgain({ href, nothing }: StartAgainProps) {
	return (
		<div className="flex flex-col gap-5">
			<Note tone="waiting" title="Start again with your email address.">
				This request has expired, or it began in another browser. {nothing}
			</Note>
			<ButtonLink href={href} size="lg" fullWidth icon="arrow-left">
				Enter your email again
			</ButtonLink>
		</div>
	);
}
