import { ButtonLink } from "@/components/contour/Button";
import { TextLink } from "@/components/contour/TextLink";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { SkipLink } from "@/components/shell/SkipLink";
import { androidAppUrl } from "@/features/auth/androidApp";

/**
 * The front door: what DECA Mark is in one paragraph, Sign in, and how observers get the app. Someone who is
 * already signed in never sees it; the proxy sends them to their workspace.
 */
export default function HomePage() {
	const android = androidAppUrl();
	return (
		<div className="relative flex min-h-dvh flex-col bg-ground">
			<SkipLink />
			<PublicHeader />
			<main
				id="main"
				tabIndex={-1}
				className="mx-auto w-full max-w-(--container-page) flex-1 px-4 pt-10 pb-14 md:px-gutter md:pt-16 xl:px-23">
				<div className="flex max-w-2xl flex-col items-start gap-6">
					<h1 className="type-page text-ink md:type-hero">DECA Mark</h1>
					<p className="type-lead text-ink">
						Observers mark where play happens on a site map and answer the project&rsquo;s form, even
						without signal. Managers prepare maps from QGIS, publish forms and read what comes back.
					</p>
					<ButtonLink variant="primary" size="lg" href="/sign-in">
						Sign in
					</ButtonLink>
					<p className="type-body text-ink-2">
						Observers collect with the DECA Mark app on Android. Your project manager sends the install link
						and a join code.
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
			</main>
		</div>
	);
}
