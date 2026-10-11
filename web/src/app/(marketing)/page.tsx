import type { Metadata } from "next";

import { ButtonLink } from "@/components/contour/Button";
import { PAGE_TITLE_ID } from "@/components/contour/PageHeader";
import { TextLink } from "@/components/contour/TextLink";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { SkipLink } from "@/components/shell/SkipLink";
import { androidAppUrl } from "@/features/auth/androidApp";
import { EvidenceSection } from "@/features/home/EvidenceSection";
import { FieldIsland } from "@/features/home/FieldIsland";
import { HomeFooter } from "@/features/home/HomeFooter";
import { RoleColumns } from "@/features/home/RoleColumns";

export const metadata: Metadata = {
	title: { absolute: "FieldMaps · Offline field collection for research teams" },
	description:
		"Observers place each observation on a site map and answer the project's form, with or without signal. The research team prepares the maps, publishes the forms and reads what comes back."
};

const FRAME = "mx-auto w-full max-w-(--container-page) px-4 md:px-gutter xl:px-23";

/**
 * The front door: what DECA Mark is, the next step for each visitor, what each side of a study does, and
 * what the product will and will not claim. Someone who is already signed in never sees it; the proxy
 * sends them to their workspace.
 */
export default function HomePage() {
	const android = androidAppUrl();
	return (
		<div className="relative flex min-h-dvh flex-col bg-ground">
			<SkipLink />
			<PublicHeader>
				<TextLink href="/sign-in" tone="ink" className="inline-flex min-h-touch items-center">
					Sign in
				</TextLink>
			</PublicHeader>
			<main id="main" tabIndex={-1} className={`${FRAME} flex flex-1 flex-col gap-14 pt-8 pb-14 md:pt-14`}>
				<section aria-labelledby={PAGE_TITLE_ID} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
					<div className="flex max-w-2xl flex-col items-start">
						<p className="type-mono-label text-ink-2">Offline field collection for research teams</p>
						<h1
							id={PAGE_TITLE_ID}
							tabIndex={-1}
							className="mt-4 type-page text-ink sm:type-hero xl:type-display">
							<span className="sm:block">The observation.</span>{" "}
							<span className="sm:block">The place.</span> <span className="sm:block">The evidence.</span>
						</h1>
						<p className="mt-6 type-lead text-ink">
							Observers place each observation on a site map and answer the project&rsquo;s form, with or
							without signal. The research team prepares the maps, publishes the forms and reads what
							comes back.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<ButtonLink variant="primary" size="lg" href="/sign-in">
								Sign in
							</ButtonLink>
							<ButtonLink variant="outline" size="lg" href="/sign-up">
								Create an account
							</ButtonLink>
						</div>
						<div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 type-body text-ink-2">
							<p>
								<strong className="font-semibold text-ink">Invited to a project?</strong> Open the
								invitation link you were sent, or create an account and enter your join code.
							</p>
							<p>
								<strong className="font-semibold text-ink">Collecting in the field?</strong> Observers
								use the FieldMaps app on Android. Your project manager sends the install link.
								{android && (
									<>
										{" "}
										<TextLink href={android} tone="ink">
											Get the Android app
										</TextLink>
									</>
								)}
							</p>
						</div>
					</div>
					<FieldIsland />
				</section>

				<RoleColumns />
				<EvidenceSection />
			</main>
			<HomeFooter className={`${FRAME} pb-10`} />
		</div>
	);
}
