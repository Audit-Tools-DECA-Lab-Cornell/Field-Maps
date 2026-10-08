import type { ReactNode } from "react";

import { AuthSplit } from "@/components/shell/AuthSplit";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { AccountChip } from "@/features/auth/AccountChip";
import { AuthHero } from "@/features/auth/AuthHero";
import { INVITEE } from "@/features/auth/invitation";
import { PreviewLine } from "@/features/auth/PreviewLine";

/**
 * The invitation and join pages (Org 11, Org 12), for someone already signed in: the header names the
 * account in place of the Privacy link, with a way out for the wrong person. They still read sample data
 * (WEB-06 connects them), so they carry the Preview data footer line.
 */
export default function SignedInLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<>
			<PublicHeader brandMarkOnlyOnPhones>
				<AccountChip person={INVITEE} />
			</PublicHeader>
			<main id="main" tabIndex={-1} className="flex flex-1 flex-col">
				<AuthSplit hero={<AuthHero />}>{children}</AuthSplit>
			</main>
			<PreviewLine />
		</>
	);
}
