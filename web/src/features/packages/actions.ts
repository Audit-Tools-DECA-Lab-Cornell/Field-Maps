"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * A map package was prepared in the browser (`preparePackage` sends it straight to DECA Mark, because it can
 * be larger than a form post may carry). This refreshes everything that shows a site's current package:
 * Sites, the site page, Overview and QGIS.
 */

const scopeSchema = z.object({ org: z.string().min(1), project: z.string().min(1) });

export async function packageUploaded(scope: { org: string; project: string }): Promise<{ status: "done" }> {
	const { org, project } = scopeSchema.parse(scope);
	revalidatePath(`/o/${org}/p/${project}`, "layout");
	return { status: "done" };
}
