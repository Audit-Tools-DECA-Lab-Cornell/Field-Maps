"use client";

import { Button } from "@/components/contour/Button";
import { IconButton } from "@/components/contour/IconButton";
import { Island, IslandSection } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ProposalNote } from "@/components/contour/ProposalNote";
import { StateBadge } from "@/components/contour/StateBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { StackedRows } from "@/features/team/StackedRows";
import { ROUND_PLAN, type RoundPlan, roundsRecorded } from "@/fixtures";

import { useProjectSettings } from "./store";

const WINDOWS = ["Morning", "Midday", "Afternoon"] as const;

export type RoundsScreenProps = { org: string; project: string };

/**
 * Rounds (project-18, proposal U6): the rounds recorded so far, from uploaded observations, beside an
 * optional schedule that is only a planning example. Nothing here is assigned, scheduled or stored.
 */
export function RoundsScreen({ org, project }: RoundsScreenProps) {
	const { toast } = useToast();
	const { screenState, offline } = usePreview();
	const { settings, update } = useProjectSettings(org, project);
	const recorded = roundsRecorded(project);
	const base = projectHref(org, project);
	const live = screenState === "normal" || screenState === "offline";

	const planned: (RoundPlan & { added: boolean })[] = [
		...ROUND_PLAN.map(plan => ({ ...plan, added: false })),
		...Array.from({ length: settings.plannedRounds }, (_, index) => {
			const round = ROUND_PLAN.length + index + 1;
			return {
				round,
				window: WINDOWS[(round - 1) % WINDOWS.length] ?? "Morning",
				zones: "All zones",
				observers: "Unassigned",
				added: true
			};
		})
	];

	function addRound() {
		const round = planned.length + 1;
		update({ plannedRounds: settings.plannedRounds + 1 });
		toast({
			title: `Round ${round} added to the schedule preview`,
			description: "An example only. Nothing is stored or assigned.",
			action: {
				label: "Undo",
				altText: "Undo adding the round",
				onClick: () => update({ plannedRounds: Math.max(0, settings.plannedRounds) })
			}
		});
	}

	const removeButton = (plan: (typeof planned)[number]) =>
		plan.added && plan.round === planned.length ? (
			<IconButton
				icon="x"
				size="sm"
				label={`Remove planned round ${plan.round}`}
				disabled={offline}
				onClick={() => update({ plannedRounds: Math.max(0, settings.plannedRounds - 1) })}
			/>
		) : null;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[{ label: "Settings", href: `${base}/settings` }, { label: "Rounds" }]}
				title="Rounds"
				lead="No scheduled assignments are assumed for the pilot."
				actions={
					<Button
						variant="outline"
						icon="plus"
						disabled={offline}
						disabledReason={offline ? "You are offline. The schedule preview cannot change." : undefined}
						onClick={addRound}>
						Add a planned round
					</Button>
				}
			/>
			<ProposalNote code="U6" inline>
				Round planning is optional and undecided. Dates and assignments on the right are a planning example, not
				stored entities.
			</ProposalNote>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,26fr)_minmax(0,21fr)] lg:items-start">
				<Island
					flush
					className="relative"
					title="Rounds recorded so far"
					meta={live ? "From uploaded observations" : undefined}
					footnote="In the pilot the observer picks the round number in the session brief. Nothing here is assigned or scheduled.">
					<PreviewStateView
						loadingLabel="Loading rounds…"
						rows={3}
						headingLevel={3}
						empty={{
							icon: "calendar",
							title: "No rounds recorded yet",
							body: "Rounds appear here once observations are uploaded. The observer picks the round in the session brief."
						}}
						filtered={{
							title: "No rounds match this view",
							body: "Change your filters to see more rounds. The observations are unchanged."
						}}>
						{recorded.length === 0 ? (
							<p className="px-island-pad py-5 type-body text-ink-2">
								No observations have been uploaded yet, so no round is recorded.
							</p>
						) : (
							<>
								<div className="hidden sm:block">
									<Table caption="Rounds recorded so far, from uploaded observations">
										<THead>
											<tr>
												<Th>Round</Th>
												<Th>Observations</Th>
												<Th>Zones</Th>
												<Th>Observers</Th>
											</tr>
										</THead>
										<TBody>
											{recorded.map(round => (
												<Tr key={round.round}>
													<Td nowrap>Round {round.round}</Td>
													<Td mono>{round.count}</Td>
													<Td>{round.zones}</Td>
													<Td mono>{round.observers.join(" ")}</Td>
												</Tr>
											))}
										</TBody>
									</Table>
								</div>
								<StackedRows
									label="Rounds recorded so far, from uploaded observations"
									rows={recorded.map(round => ({
										key: String(round.round),
										title: <p className="font-semibold text-ink">Round {round.round}</p>,
										fields: [
											{ label: "Observations", value: round.count, mono: true },
											{ label: "Zones", value: round.zones },
											{ label: "Observers", value: round.observers.join(" "), mono: true }
										]
									}))}
								/>
							</>
						)}
					</PreviewStateView>
				</Island>

				<Island
					flush
					className="relative"
					title="Optional schedule preview"
					meta={live ? <StateBadge kind="proposal" state="notStored" size="sm" /> : undefined}>
					<PreviewStateView
						loadingLabel="Loading the schedule preview…"
						rows={3}
						headingLevel={3}
						empty={{
							icon: "calendar",
							title: "No planned rounds",
							body: "Add a planned round to sketch a schedule. It is an example only and is not stored."
						}}>
						<div className="hidden sm:block">
							<Table caption="Optional schedule preview, not stored">
								<THead>
									<tr>
										<Th>Round</Th>
										<Th>Window</Th>
										<Th>Zones</Th>
										<Th>Observers</Th>
										{settings.plannedRounds > 0 && (
											<Th>
												<span className="sr-only">Actions</span>
											</Th>
										)}
									</tr>
								</THead>
								<TBody>
									{planned.map(plan => (
										<Tr key={plan.round}>
											<Td nowrap>Round {plan.round}</Td>
											<Td>
												{plan.window} <span className="text-ink-2">· example</span>
											</Td>
											<Td>{plan.zones}</Td>
											<Td className="text-ink-2">{plan.observers}</Td>
											{settings.plannedRounds > 0 && (
												<Td className="text-right">{removeButton(plan)}</Td>
											)}
										</Tr>
									))}
								</TBody>
							</Table>
						</div>
						<StackedRows
							label="Optional schedule preview, not stored"
							rows={planned.map(plan => ({
								key: String(plan.round),
								title: <p className="font-semibold text-ink">Round {plan.round}</p>,
								aside: removeButton(plan),
								fields: [
									{
										label: "Window",
										value: (
											<>
												{plan.window} <span className="text-ink-2">· example</span>
											</>
										)
									},
									{ label: "Zones", value: plan.zones },
									{ label: "Observers", value: <span className="text-ink-2">{plan.observers}</span> }
								]
							}))}
						/>
						<IslandSection rule className="py-4">
							<TextLink href={`${base}/settings#coverage`} icon="settings" arrow={false}>
								Configure a coverage target instead
							</TextLink>
						</IslandSection>
					</PreviewStateView>
				</Island>
			</div>
		</div>
	);
}
