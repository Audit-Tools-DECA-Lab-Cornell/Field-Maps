import { ButtonLink } from "@/components/contour/Button";
import { Note } from "@/components/contour/Note";
import { supabaseConfig } from "@/lib/supabase/config";

/** Whether this deployment can sign anyone in. Without it the signed-out pages show NotConfigured. */
export function signInAvailable(): boolean {
	return supabaseConfig() !== null;
}

/** What a signed-out page shows in place of a form that could not work. */
export function NotConfigured() {
	return (
		<Note tone="attention" title="Signing in is not available here right now.">
			Try again in a few minutes, or ask the person who set up FieldMaps for your team.
		</Note>
	);
}

export type StartAgainProps = {
	/** Where the person enters their address again. */
	href: string;
	/** What did not happen, for the note's second sentence: "Nothing was verified." */
	nothing: string;
};

/**
 * A code page opened without the address its code went to: FieldMaps keeps that address in an httpOnly
 * cookie for 30 minutes, so it has expired, or the flow began in another browser.
 */
export function StartAgain({ href, nothing }: StartAgainProps) {
	return (
		<div className="flex flex-col gap-5">
			<Note tone="waiting" title="Start again with your email address.">
				This request has expired, or it began in another browser. {nothing}
			</Note>
			<ButtonLink variant="primary" href={href} size="lg" fullWidth icon="arrow-left">
				Enter your email again
			</ButtonLink>
		</div>
	);
}
