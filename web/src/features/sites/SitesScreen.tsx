"use client";

import Link from "next/link";

import { CoverageDots } from "@/components/contour/CoverageDots";
import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { activeRow, packageRows, sizeLabel } from "@/features/packages/model";
import { packagesStore } from "@/features/packages/store";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { useSessionStore } from "@/features/shell/useSessionStore";
import { coverageSummary, observationsFor, type Site, sitesIn } from "@/fixtures";
import type { ProjectedSite } from "@/lib/plan";

import { CreateSiteDialog } from "./CreateSiteDialog";
import { targetOf } from "./model";
import { Eyebrow, SiteThumbnail } from "./parts";
import { type CreatedSite, useSitesPreview } from "./store";

/**
 * Sites (project-06): every place in the project with its plan, its active map package and its coverage
 * against the illustrative target. Sites created in this preview join the list with no map package yet.
 */
export function SitesScreen({
	org,
	project,
	plans
}: {
	org: string;
	project: string;
	/** Each fixture site's projected plan, loaded on the server for the thumbnails. */
	plans: Record<string, ProjectedSite>;
}) {
	const { created } = useSitesPreview();
	const packages = useSessionStore(packagesStore);
	const sites = sitesIn(project);
	const createdHere = created.filter(site => site.projectSlug === project);
	const base = projectHref(org, project, "sites");

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Sites"
				lead="Places in this project, each with versioned maps and zones."
				actions={
					<CreateSiteDialog
						project={project}
						existing={[...sites.map(site => site.name), ...createdHere.map(site => site.name)]}
					/>
				}
			/>
			<Island flush aria-label="Sites in this project">
				<PreviewStateView
					loadingLabel="Loading sites…"
					rows={3}
					headingLevel={2}
					empty={{
						icon: "map",
						title: "No sites yet",
						body: "A site is one real place. Create one, then upload its first QGIS package to give observers a map."
					}}
					filtered={{
						title: "No sites match this view",
						body: "Change your filters to see more sites. Your sites are unchanged."
					}}>
					<ul className="divide-y divide-rule">
						{sites.map(site => (
							<li key={site.slug}>
								<FixtureSiteRow
									site={site}
									href={`${base}/${site.slug}`}
									plan={plans[site.slug]}
									packages={packageRows(site.slug, packages[site.slug] ?? {})}
								/>
							</li>
						))}
						{createdHere.map(site => (
							<li key={site.slug}>
								<CreatedSiteRow site={site} href={`${base}/${site.slug}`} />
							</li>
						))}
					</ul>
				</PreviewStateView>
			</Island>
			<Note icon="layers">
				Zone geometry comes from versioned QGIS packages for the pilot. Editing boundaries on the web is a
				separate, clearly marked proposal.
			</Note>
		</div>
	);
}

const ROW =
	"group grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 sm:gap-x-5 px-island-pad py-5 " +
	"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-ground " +
	"[--ct-size-focus-gap:calc(var(--ct-size-focus-ring)*-2)] " +
	"md:grid-cols-[9.75rem_minmax(0,1fr)_auto] " +
	"lg:grid-cols-[9.75rem_minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto]";

/** The package and coverage columns sit under the name until the row is wide enough for all four. */
const DETAIL = "col-span-3 md:col-span-1 md:col-start-2 lg:col-start-auto";

function Chevron() {
	return (
		<Icon
			name="chevron-right"
			size={22}
			className="col-start-3 row-start-1 shrink-0 text-ink lg:col-start-auto lg:row-start-auto"
		/>
	);
}

function SiteTitle({ name, summary }: { name: string; summary: string }) {
	return (
		<div className="min-w-0">
			<h2 className="type-island text-ink sm:type-section">{name}</h2>
			<p className="mt-1 type-small text-ink-2 sm:type-body">{summary}</p>
		</div>
	);
}

function FixtureSiteRow({
	site,
	href,
	plan,
	packages
}: {
	site: Site;
	href: string;
	plan: ProjectedSite | undefined;
	packages: ReturnType<typeof packageRows>;
}) {
	const active = activeRow(packages);
	const coverage = coverageSummary(site.projectSlug, site.slug);
	const recorded = observationsFor(site.projectSlug, site.slug).length;
	const rounds = targetOf(site.projectSlug).roundsPerZone;

	return (
		<Link href={href} className={ROW}>
			{plan ? (
				<SiteThumbnail site={plan} className="w-20 md:w-39" />
			) : (
				<span
					aria-hidden="true"
					className="aspect-[36/25] w-24 rounded-thumb border border-dashed border-edge md:w-39"
				/>
			)}
			<SiteTitle name={site.name} summary={site.summary} />

			<div className={DETAIL}>
				<Eyebrow>Map package</Eyebrow>
				{active?.state === "bundled" ? (
					<p className="mt-2 type-body text-ink">Bundled with the app</p>
				) : active ? (
					<p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<span className="type-mono-data text-ink">
							{active.version} {sizeLabel(active)}
						</span>
						<StateBadge kind="package" state="active" />
					</p>
				) : (
					<p className="mt-2 type-body text-ink-2">No map package yet</p>
				)}
			</div>

			<div className={DETAIL}>
				<Eyebrow>Coverage</Eyebrow>
				{site.training ? (
					<div className="mt-2">
						<StateBadge kind="coverage" state="training" />
						<p className="mt-1 type-body text-ink-2">
							{site.coverageNote ?? "never counted toward coverage"}
						</p>
					</div>
				) : (
					<div className="mt-2 flex items-start gap-4">
						<CoverageDots
							values={coverage.dots}
							layout="grid"
							columns={rounds}
							className="mt-1"
							label={`${coverage.met} of ${coverage.total} zone-rounds met the target`}
						/>
						<div className="min-w-0">
							{recorded === 0 ? (
								<StateBadge kind="coverage" state="none" />
							) : coverage.met === coverage.total ? (
								<StateBadge kind="coverage" state="complete" />
							) : (
								<StateBadge
									kind="coverage"
									state="belowExample"
									label={`${coverage.met} of ${coverage.total} zone-rounds`}
								/>
							)}
							<p className="mt-1 type-body text-ink-2">
								{site.coverageNote ?? "on the illustrative target"}
							</p>
						</div>
					</div>
				)}
			</div>
			<Chevron />
		</Link>
	);
}

function CreatedSiteRow({ site, href }: { site: CreatedSite; href: string }) {
	return (
		<Link href={href} className={ROW}>
			<span
				aria-hidden="true"
				className="grid aspect-[36/25] w-24 place-items-center rounded-thumb border border-dashed border-edge text-ink-2 md:w-39">
				<Icon name="layers" size={20} />
			</span>
			<SiteTitle name={site.name} summary="Created in this preview · no zones yet" />
			<div className={DETAIL}>
				<Eyebrow>Map package</Eyebrow>
				<p className="mt-2 type-body text-ink">No map package yet</p>
			</div>
			<div className={DETAIL}>
				<Eyebrow>Coverage</Eyebrow>
				<div className="mt-2">
					<StateBadge kind="coverage" state="none" />
					<p className="mt-1 type-body text-ink-2">no map to collect on yet</p>
				</div>
			</div>
			<Chevron />
		</Link>
	);
}
