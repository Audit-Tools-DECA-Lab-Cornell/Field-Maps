import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SetupFlow } from "@/components/onboarding/SetupFlow";

export const metadata: Metadata = {
	title: "Set up a study",
	robots: { index: false }
};

/**
 * The manager's set-up journey (J1), as a clickable preview: sign up → create organization → first
 * project → upload the QGIS site package → import and publish the form → invite observers. The
 * tenancy API (BE-07) and web auth (WEB-03/04) do not exist yet, so nothing on this page is saved —
 * the banner below says so, and no control claims to do more than show what the flow would look like.
 *
 * This route sits in `(app)`, a group with no layout of its own: the root layout applies, and the
 * workspace chrome (the rail, the project switcher) is deliberately not used here, since there is no
 * project yet.
 */
export default function OnboardingPage() {
	return (
		<div className="flex min-h-dvh flex-col bg-bg">
			<header className="flex shrink-0 flex-wrap items-center justify-between gap-loose border-b border-edge px-gutter py-snug">
				<Link href="/" className="flex min-h-9 shrink-0 items-center gap-snug rounded-md">
					<Image src="/icons/icon.svg" alt="" width={24} height={24} unoptimized className="rounded-[22%]" />
					<span className="text-body font-medium text-text" translate="no">
						FieldMaps
					</span>
				</Link>
				<Link
					href="/"
					className="inline-flex min-h-11 items-center rounded-sm px-snug text-detail text-neutral-400 hover:text-accent-300">
					Exit preview
				</Link>
			</header>

			<div className="shrink-0 border-b border-edge bg-attention-ground px-gutter py-snug" role="status">
				<p className="mx-auto flex max-w-[1100px] items-start gap-tight text-detail text-attention-text">
					<span aria-hidden className="mt-[2px] shrink-0">
						◷
					</span>
					<span>
						Preview of the set-up flow · nothing is saved. Creating organizations needs the tenancy API
						(BE-07); sign-in arrives with WEB-04.
					</span>
				</p>
			</div>

			<main className="mx-auto w-full max-w-[1100px] flex-1 px-gutter py-wide">
				<SetupFlow />
			</main>
		</div>
	);
}
