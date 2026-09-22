import { PageHeader } from "@/components/app-shell/PageHeader";
import { PackageUpload } from "@/components/basemaps/PackageUpload";
import { AttentionNote, Chip, FadeRule, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { BASEMAP_PACKAGES } from "@/data/basemaps";
import { SITES } from "@/data/project";
import { plural } from "@/lib/format";
import { PREP_STATES } from "@/lib/states";

export const metadata = { title: "Base maps" };

/**
 * Base maps: turning a QGIS project into something an observer can carry into a field with no
 * signal. The point of the screen is the checklist — a `.qgz` is a set of references, and every
 * one of them is a way the package can fail quietly.
 */
export default function BasemapsPage() {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<PageHeader
				kicker="From QGIS to the device"
				title={`${plural(BASEMAP_PACKAGES.length, "base map package")}`}
				lead="A .qgz file is not a package. It references its sources, so preparation resolves them, checks the CRS, renders only the imagery the licence permits, and only then produces something downloadable."
			/>

			<div className="px-gutter pb-page">
				<div className="grid grid-cols-1 gap-wide lg:grid-cols-3">
					{BASEMAP_PACKAGES.map(pkg => {
						const site = SITES.find(entry => entry.id === pkg.siteId);
						const badge = PREP_STATES[pkg.state];
						return (
							<section key={pkg.id} className="min-w-0">
								<div className="flex items-baseline justify-between gap-snug">
									<h2 className="min-w-0 truncate text-heading text-text">
										{site?.name ?? pkg.siteId}
									</h2>
									<Chip tone={badge.tone} glyph={badge.glyph}>
										{badge.label}
									</Chip>
								</div>
								<p className="mt-hair text-micro text-neutral-600" translate="no">
									{pkg.source}
								</p>
								<p className="mt-hair text-micro text-neutral-500">{pkg.detail}</p>

								<ol className="m-0 mt-base list-none p-0">
									{pkg.steps.map(step => {
										const stepBadge = PREP_STATES[step.state];
										return (
											<li
												key={step.name}
												className="flex gap-snug border-b border-rule-faint py-snug">
												<span
													aria-hidden
													className={`mt-[2px] w-4 shrink-0 text-center text-caption ${
														step.state === "done"
															? "text-accent-400"
															: step.state === "waiting"
																? "text-neutral-600"
																: "text-attention"
													}`}>
													{stepBadge.glyph}
												</span>
												<span className="min-w-0">
													<span className="block text-detail text-neutral-200">
														{step.name}
													</span>
													<span className="block text-micro text-neutral-500">
														{step.detail}
													</span>
													<span className="sr-only">{stepBadge.label}</span>
												</span>
											</li>
										);
									})}
								</ol>
							</section>
						);
					})}
				</div>

				<FadeRule className="my-wide" />

				<PackageUpload />

				<FadeRule className="my-wide" />

				<div className="grid grid-cols-1 gap-wide lg:grid-cols-2">
					<section className="max-w-[60ch]">
						<SectionLabel>The failure that matters most</SectionLabel>
						<h2 className="mt-tight mb-base text-heading text-text">
							Imagery you may look at is not imagery you may repackage
						</h2>
						<AttentionNote
							title="Courtyard is blocked on its basemap licence"
							body="riverside_courtyard.qgz references a Google tile source. Tiles that a desktop may draw on demand are not tiles an institution may render, store and redistribute inside an offline package. The extent needs institution-owned or openly licensed imagery instead."
						/>
						<Prose tone="faint" className="mt-base">
							This check has to sit before the render step rather than after it, because by the time tiles
							exist on a device the licence has already been broken.
						</Prose>
					</section>

					<section className="max-w-[60ch]">
						<SectionLabel>What reaches a device</SectionLabel>
						<h2 className="mt-tight mb-base text-heading text-text">
							Preparing one is real; carrying it is not, yet
						</h2>
						<AttentionNote
							title="The collector still reads its bundled packages"
							body="A package prepared here is stored, versioned and downloadable from the API, but the collector has not been switched from its bundled geometry to fetching one. That is the next piece: a hosted package provider on the device, with the download and cellular policy that belong to it."
						/>
						<Prose tone="faint" className="mt-base">
							Until then the loop is the one in the QGIS base map testing guide: prepare here to see the
							checks, and put the same exports into the collector’s source to see them on a device.
						</Prose>
					</section>
				</div>
			</div>
		</div>
	);
}
