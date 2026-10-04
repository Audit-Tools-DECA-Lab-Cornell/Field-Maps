import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SetupFlow } from "@/components/onboarding/SetupFlow";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
	title: "Set up a study",
	robots: { index: false }
};

export default async function OnboardingPage() {
	await requireUser();
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
					href="/account"
					className="inline-flex min-h-11 items-center rounded-sm px-snug text-detail text-neutral-400 hover:text-accent-300">
					Account
				</Link>
			</header>

			<div className="shrink-0 border-b border-edge bg-attention-ground px-gutter py-snug" role="status">
				<p className="mx-auto flex max-w-[1100px] items-start gap-tight text-detail text-attention-text">
					<span aria-hidden className="mt-[2px] shrink-0">
						◷
					</span>
					<span>
						Preview only. Nothing here is saved yet. Organization setup will be connected in a later update.
						Your account is signed in.
					</span>
				</p>
			</div>

			<main className="mx-auto w-full max-w-[1100px] flex-1 px-gutter py-wide">
				<SetupFlow />
			</main>
		</div>
	);
}
