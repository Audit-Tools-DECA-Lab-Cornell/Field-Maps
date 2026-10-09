import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { AppHeader } from "@/components/shell/AppHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { ShellMain } from "@/components/shell/ShellMain";
import { PLACE_COOKIE } from "@/features/shell/navigation";
import { UNKNOWN_ERROR_COPY } from "@/lib/api/errors";
import { getWorkspace } from "@/lib/api/workspace";
import { homeFor } from "@/lib/workspace/home";

export const metadata: Metadata = { title: "Your projects · FieldMaps" };

function rememberedPlace(value: string | undefined): string | undefined {
	if (!value) return undefined;
	try {
		return decodeURIComponent(value);
	} catch {
		return undefined;
	}
}

/**
 * Opening FieldMaps: the project the person had open last on this browser, if they still belong to it;
 * otherwise their only project, or their first organization (`homeFor`). Someone who belongs to nothing
 * yet is told how to join.
 */
export default async function WorkspaceHome() {
	// Read per request, before anything else: who is signed in decides where this page goes.
	const remembered = rememberedPlace((await cookies()).get(PLACE_COOKIE)?.value);
	const workspace = await getWorkspace();
	if (workspace.status === "ready") {
		const home = homeFor(workspace, remembered);
		if (home) redirect(home);
	}

	return (
		<>
			<AppHeader />
			<ShellMain>
				{workspace.status === "ready" ? (
					<div className="mx-auto flex max-w-3xl flex-col gap-6 py-4 md:py-10">
						<PageHeader
							title="You are not in a project yet"
							lead="A project manager adds you with a join code or an invitation link."
						/>
						<Island>
							<div className="flex flex-col items-start gap-4">
								<p className="type-body text-ink">
									If your project manager gave you a join code, enter it to join their project.
								</p>
								<ButtonLink variant="primary" href="/join" icon="arrow-right">
									Enter a join code
								</ButtonLink>
								<p className="type-small text-ink-2">
									Or open the invitation link your project manager sent you.
								</p>
							</div>
						</Island>
					</div>
				) : (
					<div className="mx-auto max-w-3xl py-4 md:py-10">
						<LoadFailure
							failure={
								workspace.failure ?? { code: "unknown", kind: "retry", message: UNKNOWN_ERROR_COPY }
							}
							what="your projects"
						/>
					</div>
				)}
			</ShellMain>
		</>
	);
}
