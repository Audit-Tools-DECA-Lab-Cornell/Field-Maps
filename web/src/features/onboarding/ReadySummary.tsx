"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Icon, type IconName } from "@/components/contour/Icon";
import { Mono } from "@/components/contour/Mono";
import { Note } from "@/components/contour/Note";
import { TextLink } from "@/components/contour/TextLink";

import { OnboardingFrame, ScreenHeading } from "./OnboardingFrame";
import { firstOpenStep, PREVIEW_PROJECT_HREF, stepHref } from "./steps";
import { useSetup } from "./store";

type NextItem = { icon: IconName; title: string; detail: string; href: string; link: string };

const NEXT: readonly NextItem[] = [
	{
		icon: "layers",
		title: "Upload the site's QGIS package",
		detail: "Sites › Map packages: upload the export, inspect the checks, then activate the version.",
		href: `${PREVIEW_PROJECT_HREF}/sites`,
		link: "Open Sites"
	},
	{
		icon: "pencil",
		title: "Review the form draft and publish it",
		detail: "Observers can collect once a form version is published.",
		href: `${PREVIEW_PROJECT_HREF}/forms`,
		link: "Open Forms"
	},
	{
		icon: "users",
		title: "Share the observer join code",
		detail: "Observers enter it in the app, then download the site on Wi-Fi.",
		href: `${PREVIEW_PROJECT_HREF}/team`,
		link: "Open Team"
	}
];

/**
 * The end of set-up. It says plainly that this was a preview and nothing was created, then points to the
 * sample project's pages for what a manager does next (J1). The answers stay on the right.
 */
export function ReadySummary() {
	const router = useRouter();
	const { state, reset, hydrated } = useSetup();
	const open = firstOpenStep(state);

	// The summary follows the five steps; arriving early goes to the first step still open.
	useEffect(() => {
		if (hydrated && open !== null) router.replace(stepHref(open));
		// Only on arrival.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hydrated]);

	function startAgain() {
		reset();
		router.push(stepHref("organization"));
	}

	return (
		<OnboardingFrame state={state} current={null}>
			<ScreenHeading
				screen="ready"
				kicker="First workspace · Preview"
				title="Your workspace is ready"
				lead="This is what finishing creates. Your answers are listed under Your workspace so far, and any step can still be changed."
			/>

			<div className="mt-8 flex flex-col gap-8">
				<Note>
					<Mono variant="label" className="mr-2 text-ink-2">
						Preview data
					</Mono>
					Nothing was created. The organization, project and invitations exist only in this browser tab, and
					nothing is read from or written to the FieldMaps database.
				</Note>

				<section aria-labelledby="next-title">
					<h2 id="next-title" className="type-island text-ink">
						What comes next
					</h2>
					<ol className="mt-2">
						{NEXT.map(item => (
							<li
								key={item.title}
								className="flex items-start gap-3 border-b border-rule py-4 last:border-b-0">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-well text-ink">
									<Icon name={item.icon} size={18} />
								</span>
								<div className="min-w-0 flex-1">
									<h3 className="type-body font-semibold text-ink">{item.title}</h3>
									<p className="type-small text-ink-2">{item.detail}</p>
									<p className="mt-1 type-body">
										<TextLink href={item.href} className="inline-flex min-h-touch items-center">
											{item.link}
										</TextLink>
									</p>
								</div>
							</li>
						))}
					</ol>
				</section>

				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-3 sm:flex-row">
						<ButtonLink href={PREVIEW_PROJECT_HREF} size="lg" iconRight="arrow-right" className="sm:flex-1">
							Open the project overview
						</ButtonLink>
						<Button variant="outline" size="lg" icon="rotate-cw" onClick={startAgain}>
							Start again
						</Button>
					</div>
					<p className="type-small text-ink-2">
						The overview shows the sample project, Play Study in DECA Lab, not these answers. Start again
						clears the answers from this tab.
					</p>
				</div>
			</div>
		</OnboardingFrame>
	);
}
