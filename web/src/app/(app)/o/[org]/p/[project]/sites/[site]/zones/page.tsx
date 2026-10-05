import { redirect } from "next/navigation";

/** Zones are listed on their site; this address goes there. */
export default async function ZonesPage({
	params
}: {
	params: Promise<{ org: string; project: string; site: string }>;
}) {
	const { org, project, site } = await params;
	redirect(`/o/${org}/p/${project}/sites/${site}`);
}
