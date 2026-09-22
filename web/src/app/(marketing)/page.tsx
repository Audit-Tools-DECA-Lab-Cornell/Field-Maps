import Image from "next/image";
import Link from "next/link";

import { Chip, FadeRule, PrimaryAction, SecondaryAction } from "@/components/nocturne/chrome";
import { ORGANIZATION } from "@/data/project";

export const metadata = {
	title: "FieldMaps — offline field collection for research teams",
	description:
		"A native collector that works with no signal, a management workspace, and one spatial database that QGIS reads directly."
};

/**
 * The front door. It is a public page, so it says what FieldMaps is and what is actually built,
 * in the collector's own language — a visitor who installs the app should recognise the ground
 * they arrived on.
 */
export default function LandingPage() {
	return (
		<div className="min-h-dvh bg-bg">
			<header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-loose px-gutter py-loose">
				<span className="flex items-center gap-snug">
					<Image src="/icons/icon.svg" alt="" width={28} height={28} unoptimized className="rounded-[22%]" />
					<span className="text-body font-medium text-text" translate="no">
						FieldMaps
					</span>
				</span>
				<nav aria-label="Site" className="flex items-center gap-loose text-detail text-neutral-400">
					<Link href="/privacy" className="rounded-sm hover:text-accent-300">
						Privacy
					</Link>
					<Link href="/overview" className="rounded-sm hover:text-accent-300">
						Open the workspace
					</Link>
				</nav>
			</header>

			<main className="mx-auto w-full max-w-5xl px-gutter pb-page">
				<section className="pt-page">
					<p className="text-meta text-neutral-400">{ORGANIZATION.name}</p>
					<h1 className="mt-snug max-w-[18ch] text-[clamp(2.25rem,1.6rem+3vw,4rem)] leading-[1.05] font-medium tracking-[-0.02em] text-balance text-text">
						Field data that survives the walk back.
					</h1>
					<p className="mt-loose max-w-[58ch] text-body text-neutral-300">
						FieldMaps is offline field collection for research teams. An observer marks a point on a site
						map and answers the study’s questions with no signal at all; the record is on the device before
						anything is sent. When a network returns, it uploads itself into a shared spatial database that
						QGIS reads directly — no export step, no file to send, nothing to keep in step.
					</p>
					<div className="mt-wide flex flex-wrap items-center gap-snug">
						<PrimaryAction href="/overview">Open the workspace</PrimaryAction>
						<SecondaryAction href="/qgis">See the QGIS connection</SecondaryAction>
					</div>
				</section>

				<FadeRule className="my-page" />

				<section className="grid grid-cols-1 gap-wide md:grid-cols-3">
					{[
						{
							kicker: "On the device",
							title: "One question at a time, offline first",
							body: "An armed place-a-point map, one question per screen against a versioned instrument, and drafts that survive a force quit. Nothing is fetched while collecting."
						},
						{
							kicker: "In the browser",
							title: "The study, not a map with a form",
							body: "Coverage against the protocol target, a coordinated map and table over one filter set, the variable library and its open questions, and the packages a site carries."
						},
						{
							kicker: "In QGIS",
							title: "The same database, read directly",
							body: "Add the PostGIS connection once and refresh the layer. A committed observation is in the layer the next time QGIS reads it."
						}
					].map(card => (
						<article key={card.kicker} className="min-w-0">
							<p className="text-meta text-neutral-400">{card.kicker}</p>
							<h2 className="mt-tight text-heading text-balance text-text">{card.title}</h2>
							<p className="mt-snug text-detail text-neutral-400">{card.body}</p>
						</article>
					))}
				</section>

				<FadeRule className="my-page" />

				<section className="max-w-[70ch]">
					<p className="text-meta text-neutral-400">Where it actually is</p>
					<h2 className="mt-tight text-question text-balance text-text">A pilot, described honestly</h2>
					<div className="mt-loose flex flex-col gap-base">
						{[
							{
								tone: "accent" as const,
								glyph: "✓",
								label: "Built",
								body: "Native sign-in, offline save, automatic upload, and two real observations confirmed in hosted PostGIS and opened in QGIS Desktop."
							},
							{
								tone: "accent" as const,
								glyph: "✓",
								label: "Built",
								body: "Site packages prepared from a QGIS project, with the imagery-licence check that refuses tiles nobody may redistribute offline."
							},
							{
								tone: "attention" as const,
								glyph: "◷",
								label: "Open",
								body: "Publishing the first full instrument. Seven variables still carry an unresolved question about what their column means."
							},
							{
								tone: "muted" as const,
								glyph: "—",
								label: "Not built",
								body: "Background sync while the app is closed, attachments, and edits travelling back from QGIS to a device."
							}
						].map((row, index) => (
							<div
								key={index}
								className="flex flex-wrap items-baseline gap-base border-b border-rule-faint pb-base">
								<Chip tone={row.tone} glyph={row.glyph}>
									{row.label}
								</Chip>
								<p className="min-w-0 flex-1 text-detail text-neutral-300">{row.body}</p>
							</div>
						))}
					</div>
					<p className="mt-loose text-micro text-neutral-500">
						The API runs on a development computer. This is not a production deployment, and the workspace
						reads local fixtures rather than the database — every screen says so where it matters.
					</p>
				</section>
			</main>

			<footer className="border-t border-edge">
				<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-base px-gutter py-loose text-micro text-neutral-500">
					<span>{ORGANIZATION.name}</span>
					<span className="flex gap-loose">
						<Link href="/privacy" className="rounded-sm hover:text-accent-300">
							Privacy policy
						</Link>
						<Link href="/privacy/delete-data" className="rounded-sm hover:text-accent-300">
							Delete your data
						</Link>
					</span>
				</div>
			</footer>
		</div>
	);
}
