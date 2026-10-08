"use client";

import { Button } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { ServerMessage, useAuthAction } from "@/features/auth/useAuthAction";
import { formatCountdown, useCooldown } from "@/features/auth/useCooldown";
import { signOut } from "@/lib/auth/actions";

/**
 * Security (org-05). "Change password" starts the recovery flow for the signed-in address: the
 * `authenticate` Server Action sends a recovery code and continues to "Choose a new password", which comes
 * back here once the password is saved. "Sign out"
 * ends this browser's session through `signOut`. The footnote says what signing out here does not touch.
 */
export function SecurityIsland({ email }: { email?: string }) {
	const cooldown = useCooldown();
	const auth = useAuthAction({ onRetryAfter: cooldown.start });
	const waiting = cooldown.remaining > 0;

	return (
		<Island
			title="Security"
			footnote="Signing out here does not affect the app. Records waiting on your phone stay there until that device uploads them.">
			<p className="type-body text-ink-2">A password change sends a recovery code to your email first.</p>
			<div className="mt-5 flex flex-col gap-4">
				<ServerMessage {...auth.note} />
				<div className="flex flex-wrap items-start gap-3">
					{email && (
						<form
							action={auth.action}
							onSubmit={event => {
								if (auth.pending || waiting) event.preventDefault();
							}}
							aria-busy={auth.pending || undefined}>
							<input type="hidden" name="intent" value="forgot-password" />
							<input type="hidden" name="email" value={email} />
							<input type="hidden" name="next" value="/account" />
							<Button
								type="submit"
								variant="outline"
								icon="lock"
								busy={auth.pending}
								busyLabel="Sending a code…"
								disabled={waiting}
								disabledReason={`Wait ${formatCountdown(cooldown.remaining)} before trying again.`}>
								Change password
							</Button>
						</form>
					)}
					<form action={signOut}>
						<Button type="submit" variant="outline" icon="log-out">
							Sign out
						</Button>
					</form>
				</div>
			</div>
		</Island>
	);
}
