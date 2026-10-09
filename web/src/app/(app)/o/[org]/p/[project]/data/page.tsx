import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadFailure } from "@/components/shell/LoadFailure";
import { type DataPlan, DataScreen } from "@/features/data/DataScreen";
import { paramsGetter, parseClientFilters, parseScope, planSiteCode } from "@/features/data/view";
import {
	getFormDefinitions,
	getProject,
	getSitePlan,
	listObservations,
	listSites,
	resolveProject
} from "@/lib/api/workspace";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Observation data" };

type Props = {
	params: Promise<{ org: string; project: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Observation data. The server loads the newest 500 observations for the chosen site and round type
 * (the only filters the list takes), the form version each one was collected with, and, when one site is
 * in view, that site's current plan. Zone, observer, days and search are applied in the browser.
 */
export default async function DataPage({ params, searchParams }: Props) {
	const { org, project: code } = await params;
	const get = paramsGetter(await searchParams);
	const project = await resolveProject(org, code);
	if (!project) notFound();

	const [details, siteList] = await Promise.all([settle(getProject(project.id)), settle(listSites(project.id))]);
	if (!details.ok) return <LoadFailure failure={details.failure} what="the project" />;
	if (!siteList.ok) return <LoadFailure failure={siteList.failure} what="the sites" />;

	// A site the project does not have is ignored, rather than loading nothing under a name that is not there.
	const requested = parseScope(get);
	const scope = {
		site: siteList.data.some(site => site.code === requested.site) ? requested.site : null,
		round: requested.round
	};
	const list = await settle(listObservations(project.id, scope.site ?? undefined, scope.round ?? undefined));
	if (!list.ok) return <LoadFailure failure={list.failure} what="the observations" />;

	// Each record is read with the form version it was collected with, never the newest one.
	const versions = [...new Set(list.data.rows.map(row => row.form_version))];
	const { definitions, missing } = await getFormDefinitions(project.id, versions);

	const sites = siteList.data.map(site => ({
		code: site.code,
		name: site.name,
		zones: (site.zones ?? []).map(zone => ({ id: zone.id, label: zone.label })),
		observationCount: site.observation_count,
		hasPackage: site.package !== null
	}));

	let plan: DataPlan | null = null;
	let planNote: string | null = null;
	const planCode = list.data.rows.length > 0 ? planSiteCode(sites, scope) : null;
	const planSite = siteList.data.find(site => site.code === planCode);
	if (planSite) {
		if (!planSite.package) {
			planNote = `${planSite.name} has no map package yet, so its observations are not drawn on a plan.`;
		} else {
			const drawn = await settle(getSitePlan(project.id, planSite.package.package_id, planSite.name));
			if (drawn.ok && drawn.data)
				plan = {
					site: drawn.data,
					siteCode: planSite.code,
					siteName: planSite.name,
					version: planSite.package.version
				};
			else planNote = `The plan of ${planSite.name} did not load. The table still lists every observation.`;
		}
	}

	return (
		<DataScreen
			org={org}
			project={code}
			timeZone={details.data.timezone}
			rows={list.data.rows}
			limited={list.data.limited}
			scope={scope}
			initialFilters={parseClientFilters(get)}
			sites={sites}
			definitions={definitions}
			missingVersions={missing}
			plan={plan}
			planNote={planNote}
		/>
	);
}
