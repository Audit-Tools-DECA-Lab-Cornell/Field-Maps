import { ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";

export type CollectProject = { code: string; name: string };

export type CollectHandoffProps = {
	organization: string;
	/** The person's observer projects in this organization, from their workspace. */
	projects: CollectProject[];
	/** Where to get the Android app, when the deployment has a link for it. */
	androidUrl: string | null;
};

/**
 * Where an observer who signs in on the web lands: collecting happens in the FieldMaps app, so this says
 * which projects they are an observer on here and how to continue. It shows only what the person's own
 * workspace holds, and an install link only when one is configured.
 */
export function CollectHandoff({ organization, projects, androidUrl }: CollectHandoffProps) {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Collect with the FieldMaps app"
				lead="Observers collect in the app. This site is for managers and viewers."
			/>
			<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
				<Island
					title={projects.length === 1 ? "Your project" : "Your projects"}
					meta={organization}
					flush={projects.length > 0}>
					{projects.length === 0 ? (
						<p className="type-body text-ink">
							You are not an observer on any project in {organization}. Collecting happens in the
							FieldMaps app, on the projects where you are an observer.
						</p>
					) : (
						<ul className="divide-y divide-rule">
							{projects.map(project => (
								<li
									key={project.code}
									className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-island-pad py-3">
									<span className="min-w-0 type-body font-semibold text-ink wrap-anywhere">
										{project.name}
									</span>
									<span className="flex items-baseline gap-4">
										<Mono variant="data" className="text-ink-2">
											{project.code}
										</Mono>
										<StateBadge kind="role" state="observer" size="sm" />
									</span>
								</li>
							))}
						</ul>
					)}
				</Island>
				<Island title="Next">
					<p className="type-body text-ink">
						Open the FieldMaps app, sign in with this account, and choose the project.
					</p>
					{androidUrl && (
						<div className="mt-5">
							<ButtonLink variant="primary" icon="external-link" href={androidUrl}>
								Get the Android app
							</ButtonLink>
						</div>
					)}
				</Island>
			</div>
		</div>
	);
}
