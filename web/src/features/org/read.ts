import "server-only";

import { notFound } from "next/navigation";

import { resolveOrg } from "@/lib/api/workspace";
import { settle } from "@/lib/workspace/result";
import type { OrgRef, Result } from "@/lib/workspace/types";

/**
 * The organization at `/o/<address>`, from the person's own memberships (no owner-only read). An address
 * they do not belong to is "not found"; a workspace that could not load comes back as a failure for the
 * page to show, never as "not found".
 */
export async function readOrg(address: string): Promise<Result<OrgRef>> {
	const found = await settle(resolveOrg(address));
	if (!found.ok) return found;
	if (!found.data) notFound();
	return { ok: true, data: found.data };
}
