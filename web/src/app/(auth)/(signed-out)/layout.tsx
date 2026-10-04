import type { ReactNode } from "react";

import { AuthSplit } from "@/components/shell/AuthSplit";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { AuthHero } from "@/features/auth/AuthHero";

/** Sign in, create an account, verify, and recover a password (Org 6–10): the brand, Privacy, and the split. */
export default function SignedOutLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<>
			<PublicHeader />
			<main id="main" tabIndex={-1} className="flex flex-1 flex-col">
				<AuthSplit hero={<AuthHero />}>{children}</AuthSplit>
			</main>
		</>
	);
}
