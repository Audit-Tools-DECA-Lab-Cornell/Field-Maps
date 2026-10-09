"use client";

import { type MouseEvent, useState } from "react";

import {
	Breadcrumbs,
	Button,
	type InkTab,
	InkTabs,
	ModeStrip,
	type ModeStripIndex,
	StepBar
} from "@/components/contour";

import { Specimen } from "./GalleryParts";

const GALLERY = "/dev/contour";

/* The eight project tabs (D21). Their hrefs stay on the gallery so a prefetch or a new tab lands here. */
const PROJECT_TABS: InkTab[] = [
	{ href: `${GALLERY}?tab=overview`, label: "Overview" },
	{ href: `${GALLERY}?tab=data`, label: "Data", badge: 1 },
	{ href: `${GALLERY}?tab=sites`, label: "Sites" },
	{ href: `${GALLERY}?tab=forms`, label: "Forms" },
	{ href: `${GALLERY}?tab=team`, label: "Team" },
	{ href: `${GALLERY}?tab=qgis`, label: "QGIS" },
	{ href: `${GALLERY}?tab=reports`, label: "Reports" },
	{ href: `${GALLERY}?tab=settings`, label: "Settings" }
];

const PACKAGE_STEPS = [
	{ key: "file", label: "File", href: "#navigation" },
	{ key: "checks", label: "Checks", href: "#navigation" },
	{ key: "upload", label: "Upload" },
	{ key: "done", label: "Done" }
];

/**
 * A plain click on a tab switches the current tab here instead of routing, so the pill can be watched
 * sliding without leaving the page. Clicks with a modifier keep their usual meaning.
 */
function useLocalTabs(initial: string) {
	const [current, setCurrent] = useState(initial);
	const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const link = (event.target as Element).closest("a[href]");
		if (!link) return;
		// Next's Link leaves a click alone once its default is prevented.
		event.preventDefault();
		setCurrent(link.getAttribute("href") ?? initial);
	};
	return { current, onClickCapture };
}

export function NavigationDemo() {
	const tabs = useLocalTabs(PROJECT_TABS[2].href);
	const [step, setStep] = useState<ModeStripIndex>(1);

	return (
		<div className="flex flex-col gap-10">
			<Specimen
				title="Project tabs"
				caption="One ink pill holds the tabs; the current tab is the white pill, and it slides. Here a click switches the tab without leaving the page. Data carries an attention badge.">
				<div onClickCapture={tabs.onClickCapture}>
					<InkTabs items={PROJECT_TABS} label="Project" current={tabs.current} />
				</div>
			</Specimen>

			<Specimen
				title="Project tabs · narrow"
				caption="When the tabs do not fit they scroll sideways, with edge fades. They never wrap or truncate.">
				<div onClickCapture={tabs.onClickCapture} className="max-w-xs">
					<InkTabs items={PROJECT_TABS} label="Project, narrow" current={tabs.current} />
				</div>
			</Specimen>

			<div className="grid gap-10 lg:grid-cols-2">
				<Specimen
					title="Step bar · map package"
					caption="Done steps show a check and stay clickable; the current step is an ink pill; later steps are not links.">
					<StepBar label="Map package steps" steps={PACKAGE_STEPS} current="checks" done={["file"]} />
				</Specimen>

				<Specimen
					title="Mode strip"
					caption="Place, Answer, Review. The current step is an ink pill that slides; a finished step can be pressed to go back.">
					<ModeStrip
						steps={["Place", "Answer", "Review"]}
						current={step}
						onSelect={setStep}
						className="max-w-md"
					/>
					<div>
						<Button
							variant="outline"
							size="sm"
							iconRight="arrow-right"
							disabled={step === 2}
							disabledReason="Review is the last step."
							onClick={() =>
								setStep(current => (current < 2 ? ((current + 1) as ModeStripIndex) : current))
							}>
							Next step
						</Button>
					</div>
				</Specimen>
			</div>

			<Specimen
				title="Breadcrumbs and page header"
				caption="Ancestors are underlined links in secondary ink; the current page is plain text. The header at the top of this page is a PageHeader: breadcrumbs, the title, the lead and the actions.">
				<Breadcrumbs
					items={[
						{ label: "Sites", href: "#navigation" },
						{ label: "Riverside", href: "#navigation" },
						{ label: "Map packages" }
					]}
				/>
			</Specimen>
		</div>
	);
}
