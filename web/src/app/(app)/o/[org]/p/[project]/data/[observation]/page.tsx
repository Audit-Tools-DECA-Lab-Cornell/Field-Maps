import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadFailure } from "@/components/shell/LoadFailure";
import { ObservationDetail, type ObservationPlan } from "@/features/observation/ObservationDetail";
import { getFormVersion, getObservation, getProject, getSite, getSitePlan, resolveProject } from "@/lib/api/workspace";
import { shortLabel } from "@/lib/labels";
import { isNotFound, settle } from "@/lib/workspace/result";

type Params = { org: string; project: string; observation: string };

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { observation } = await params;
	return { title: ID.test(observation) ? shortLabel(observation) : "Observation" };
}

/**
 * One observation. The observation read carries its own site, round and form version, so it opens even
 * when it is older than the newest 500; its answers are worded by that form version, never the newest.
 * An address that is not an observation of this project is the in-shell not-found page.
 */
export default async function ObservationPage({ params }: { params: Promise<Params> }) {
	const { org, project: code, observation: id } = await params;
	if (!ID.test(id)) notFound();
	const project = await resolveProject(org, code);
	if (!project) notFound();

	const found = await settle(getObservation(project.id, id));
	if (!found.ok) {
		if (isNotFound(found.failure)) notFound();
		return <LoadFailure failure={found.failure} what="this observation" />;
	}
	const row = found.data;

	const [details, form, site] = await Promise.all([
		settle(getProject(project.id)),
		settle(getFormVersion(project.id, row.form_version)),
		settle(getSite(project.id, row.site_code))
	]);
	if (!details.ok) return <LoadFailure failure={details.failure} what="the project" />;
	if (!form.ok && form.failure.kind === "sign-in") return <LoadFailure failure={form.failure} what="the form" />;

	let plan: ObservationPlan | null = null;
	let planNote: string | null = null;
	if (!site.ok) {
		planNote = `The plan of ${row.site_name} did not load, so the point is not drawn.`;
	} else if (!site.data.package) {
		planNote = `${row.site_name} has no map package, so the point is not drawn.`;
	} else {
		const drawn = await settle(getSitePlan(project.id, site.data.package.package_id, site.data.name));
		if (drawn.ok && drawn.data) plan = { site: drawn.data, version: site.data.package.version };
		else planNote = `The plan of ${row.site_name} did not load, so the point is not drawn.`;
	}

	return (
		<ObservationDetail
			org={org}
			project={code}
			observation={row}
			timeZone={details.data.timezone}
			definition={form.ok ? form.data.definition : null}
			zones={site.ok ? (site.data.zones ?? []).map(zone => ({ id: zone.id, label: zone.label })) : null}
			plan={plan}
			planNote={planNote}
		/>
	);
}
