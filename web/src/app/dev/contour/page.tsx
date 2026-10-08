import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
	Avatar,
	Button,
	ButtonLink,
	type ButtonVariant,
	CoverageDots,
	FactsList,
	Icon,
	IconButton,
	type IconButtonVariant,
	type IconName,
	InnerPanel,
	Island,
	IslandSection,
	Kbd,
	Mono,
	Note,
	type NoteTone,
	PageHeader,
	ProgressBar,
	ProposalNote,
	RoleLabel,
	ScreenState,
	ShortcutHint,
	StateBadge,
	Table,
	TBody,
	Td,
	TextLink,
	Th,
	THead,
	Timeline,
	ToastProvider,
	TooltipProvider,
	Tr,
	TypeBars
} from "@/components/contour";
import { MAP_PALETTES } from "@/lib/map-palette";

import { BusyDemo } from "./BusyDemo";
import { FeedbackDemo } from "./FeedbackDemo";
import { GallerySection, Specimen } from "./GalleryParts";
import { InputsDemo } from "./InputsDemo";
import { MapSpecimens } from "./MapSpecimens";
import { NavigationDemo } from "./NavigationDemo";
import { StateSpecimens } from "./StateSpecimens";
import { TableDemo } from "./TableDemo";
import { ThemeSwitch } from "./ThemeSwitch";
import { TokenSpecimens } from "./TokenSpecimens";

export const metadata: Metadata = {
	title: "Contour gallery",
	robots: { index: false, follow: false }
};

/** The gallery is a tool for building screens: development, and preview builds made with NEXT_PUBLIC_PREVIEW_TOOLS=1. */
const PREVIEW_TOOLS = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_PREVIEW_TOOLS === "1";

const SECTIONS = [
	{ id: "tokens", title: "Tokens" },
	{ id: "buttons", title: "Buttons" },
	{ id: "links", title: "Links" },
	{ id: "icon-buttons", title: "Icon buttons" },
	{ id: "islands", title: "Islands" },
	{ id: "notes", title: "Notes" },
	{ id: "facts", title: "Facts list" },
	{ id: "states", title: "State badges" },
	{ id: "coverage", title: "Coverage dots" },
	{ id: "data", title: "Type bars, timeline, progress" },
	{ id: "identity", title: "Avatars, role label, keys" },
	{ id: "inputs", title: "Inputs" },
	{ id: "navigation", title: "Navigation" },
	{ id: "table", title: "Table" },
	{ id: "screen-states", title: "Screen states" },
	{ id: "feedback", title: "Feedback" },
	{ id: "maps", title: "Maps" }
] as const;

/* Each variant with a label the designs give it (system-04, org-04, DESIGN.md §5). */
const BUTTONS: { variant: ButtonVariant; label: string; icon?: IconName; iconRight?: IconName }[] = [
	{ variant: "primary", label: "Review observations", iconRight: "arrow-right" },
	{ variant: "ink", label: "Approve", icon: "check" },
	{ variant: "outline", label: "Map packages", icon: "layers" },
	{ variant: "soft", label: "Transfer ownership", icon: "key-round" },
	{ variant: "danger", label: "Review deletion", icon: "trash-2" },
	{ variant: "danger-solid", label: "Request account deletion", icon: "triangle-alert" },
	{ variant: "ghost", label: "Clear filters", icon: "x" }
];

const BUTTON_SIZES = [
	{ size: "sm", label: "sm · 36" },
	{ size: "md", label: "md · 46" },
	{ size: "lg", label: "lg · 56" }
] as const;

const ICON_BUTTONS: { variant: IconButtonVariant; icon: IconName; label: string }[] = [
	{ variant: "map", icon: "plus", label: "Zoom in" },
	{ variant: "plain", icon: "x", label: "Close" },
	{ variant: "ink", icon: "arrow-left", label: "Back" },
	{ variant: "outline", icon: "copy", label: "Copy code" }
];

/* The designed notes, word for word (system-05, DESIGN.md §5). */
const NOTES: { tone: NoteTone; title?: string; text: string }[] = [
	{ tone: "saved", text: "Required answers are complete. Saving stores it on this device." },
	{
		tone: "waiting",
		title: "5 records are waiting on this device.",
		text: "They upload only from their owner's account."
	},
	{ tone: "uploaded", text: "Uploading 1 of 3. Keep the app open." },
	{ tone: "attention", text: "The observer code is missing from this record. Add it, then send it again." },
	{ tone: "held", text: "Uploads are held while the project is archived. Records stay on this device." },
	{ tone: "neutral", text: "The target is illustrative, not a scheduled assignment." }
];

const ZONES = [
	{ name: "North meadow", rounds: [true, true, false], state: "roundBelow" },
	{ name: "Woodland edge", rounds: [true, true, true], state: "complete" },
	{ name: "Sand area", rounds: [false, false, false], state: "below" }
] as const;

/* A few offline rows for the offline screen state, as system-06 shows them. */
const OFFLINE_ROWS = [
	{ id: "OBS-0244", zone: "Woodland edge · 3", review: "notReviewed" },
	{ id: "OBS-0243", zone: "Woodland edge · 3", review: "notReviewed" },
	{ id: "OBS-0242", zone: "North meadow · 1", review: "approved" }
] as const;

/**
 * /dev/contour: every Contour web primitive in its real size, with its states, for building and reviewing
 * screens. The switch at the top changes the whole page between Day and Dusk; the colour tokens show both
 * themes side by side. Not indexed, and not served in production unless preview tools are on.
 */
export default function ContourGalleryPage() {
	if (!PREVIEW_TOOLS) notFound();

	return (
		<ToastProvider>
			<TooltipProvider>
				<main
					id="main"
					className="mx-auto flex w-full max-w-page flex-col gap-16 bg-ground px-4 py-10 sm:px-gutter">
					<div className="flex flex-col gap-6">
						<PageHeader
							breadcrumbs={[{ label: "Dev tools" }, { label: "Contour gallery" }]}
							title="Contour"
							titleAddon={
								<Mono variant="label" className="text-ink-2">
									Web primitives
								</Mono>
							}
							lead="Every web primitive in its real size, with its states. The switch changes the whole page; the colour tokens show Day and Dusk side by side."
							actions={<ThemeSwitch />}
						/>
						<nav aria-label="Gallery sections">
							<ul className="flex flex-wrap gap-x-5 gap-y-2 type-small">
								{SECTIONS.map(section => (
									<li key={section.id}>
										<TextLink href={`#${section.id}`} tone="ink">
											{section.title}
										</TextLink>
									</li>
								))}
							</ul>
						</nav>
					</div>

					<GallerySection
						id="tokens"
						title="Tokens"
						lead="Colours, type, shape and motion from contracts/contour.json. Nothing below holds a value of its own.">
						<TokenSpecimens />
					</GallerySection>

					<GallerySection
						id="buttons"
						title="Buttons"
						lead="Primary appears once per screen. Ink is the strong second action, outline is for the rest.">
						<Specimen
							title="Variants by size"
							caption="Hover changes the fill only; press dims it. Nothing lifts.">
							<div className="overflow-x-auto">
								<table className="border-separate border-spacing-x-4 border-spacing-y-3">
									<caption className="sr-only">Button variants at each size</caption>
									<thead>
										<tr>
											<th scope="col" className="text-left type-mono-label text-ink-2">
												Variant
											</th>
											{BUTTON_SIZES.map(({ size, label }) => (
												<th
													key={size}
													scope="col"
													className="text-left type-mono-label text-ink-2">
													{label}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{BUTTONS.map(({ variant, label, icon, iconRight }) => (
											<tr key={variant}>
												<th scope="row" className="text-left font-normal">
													<Mono className="text-ink-2">{variant}</Mono>
												</th>
												{BUTTON_SIZES.map(({ size }) => (
													<td key={size}>
														<Button
															variant={variant}
															size={size}
															icon={icon}
															iconRight={iconRight}>
															{label}
														</Button>
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Specimen>
						<div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
							<Specimen title="Busy">
								<BusyDemo />
							</Specimen>
							<Specimen
								title="Disabled, with a reason"
								caption="A disabled button takes the well fill and says why on the line below, linked with aria-describedby.">
								<div className="flex flex-col items-start gap-5">
									<Button
										icon="lock"
										disabled
										disabledReason="The button turns on when both passwords match.">
										Save new password
									</Button>
									<Button
										variant="danger"
										icon="trash-2"
										disabled
										disabledReason="Only the owner can delete the organization.">
										Review deletion
									</Button>
								</div>
							</Specimen>
							<Specimen
								title="Full width and links"
								caption="Auth forms use the 56 px full-width action. A ButtonLink is a link that looks like a button.">
								<div className="flex max-w-md flex-col gap-3">
									<Button size="lg" fullWidth iconRight="arrow-right">
										Continue
									</Button>
									<ButtonLink
										href="#buttons"
										variant="outline"
										icon="arrow-left"
										className="self-start">
										Return to projects
									</ButtonLink>
								</div>
							</Specimen>
							<Specimen
								title="Keyboard focus"
								caption="Press Tab: every control shows a 3 px ring with a 3 px gap. Inside ink fills (the tab bar, a toast) the ring takes the fill's opposite colour.">
								<div className="flex flex-wrap items-center gap-3">
									<Button icon="download">Export</Button>
									<Button variant="outline" icon="plus">
										Save view
									</Button>
									<Button variant="ink">Sites</Button>
								</div>
							</Specimen>
						</div>
					</GallerySection>

					<GallerySection id="links" title="Links">
						<div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
							<Specimen
								title="Accent"
								caption="An action or a way forward that is not the screen's one button. Underlined on hover.">
								<div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
									<TextLink href="#links">Open North meadow</TextLink>
									<TextLink href="#links" icon="pencil" arrow={false}>
										Edit description
									</TextLink>
									<TextLink href="#links" arrow="left">
										Back to sites
									</TextLink>
									<TextLink href="#links" arrow={false}>
										Resend
									</TextLink>
								</div>
							</Specimen>
							<Specimen
								title="Ink"
								caption="References and escape hatches: entity links in tables, breadcrumb ancestors, Privacy.">
								<p className="max-w-prose type-body text-ink">
									<TextLink href="#links" tone="ink" className="type-mono-data">
										OBS-0244
									</TextLink>{" "}
									was recorded in{" "}
									<TextLink href="#links" tone="ink">
										Woodland edge
									</TextLink>
									. Read the{" "}
									<TextLink href="#links" tone="ink">
										privacy information
									</TextLink>{" "}
									before you join.
								</p>
							</Specimen>
						</div>
					</GallerySection>

					<GallerySection
						id="icon-buttons"
						title="Icon buttons"
						lead="A glyph alone, so each has a name: it is the accessible name and the hover title.">
						<div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
							<Specimen title="Variants · md 44 and sm 36">
								<ul className="flex flex-col gap-4">
									{ICON_BUTTONS.map(({ variant, icon, label }) => (
										<li key={variant} className="flex items-center gap-4">
											<Mono className="w-20 text-ink-2">{variant}</Mono>
											<IconButton variant={variant} icon={icon} label={label} />
											<IconButton variant={variant} icon={icon} label={label} size="sm" />
										</li>
									))}
								</ul>
							</Specimen>
							<Specimen
								title="On a map"
								caption="Zoom floats with a ledge; Layers has a 2 px ink edge because it opens a menu. At the zoom limit the name says why the button is off.">
								<div className="flex w-fit gap-2 rounded-panel bg-well p-4">
									<IconButton
										variant="map"
										icon="plus"
										label="Zoom in, closest zoom reached"
										className="shadow-ledge"
										disabled
									/>
									<IconButton variant="map" icon="minus" label="Zoom out" className="shadow-ledge" />
									<IconButton
										variant="map"
										icon="layers"
										label="Map layers"
										className="shadow-ledge"
										active
									/>
								</div>
							</Specimen>
						</div>
					</GallerySection>

					<GallerySection
						id="islands"
						title="Islands"
						lead="Content lives on islands: white, a fine edge and a 6 px ledge. No island inside an island; use an inner panel.">
						<div className="grid items-start gap-6 lg:grid-cols-2">
							<Island
								title="Island with a table"
								meta="Header 60 · rows 54"
								flush
								headingLevel={3}
								footnote="Footnotes sit inside the island, under a rule. The selected row uses a well fill and an ink bar.">
								<Table caption="Recent observations">
									<THead>
										<tr>
											<Th>Observation</Th>
											<Th>Zone · Round</Th>
											<Th>Review</Th>
										</tr>
									</THead>
									<TBody>
										<Tr selected>
											<Td mono>OBS-0244</Td>
											<Td>Woodland edge · 3</Td>
											<Td nowrap>
												<StateBadge kind="review" state="notReviewed" size="sm" />
											</Td>
										</Tr>
										<Tr>
											<Td mono>OBS-0243</Td>
											<Td>Woodland edge · 3</Td>
											<Td nowrap>
												<StateBadge kind="review" state="notReviewed" size="sm" />
											</Td>
										</Tr>
										<Tr>
											<Td mono>OBS-0242</Td>
											<Td>North meadow · 1</Td>
											<Td nowrap>
												<StateBadge kind="review" state="approved" size="sm" />
											</Td>
										</Tr>
									</TBody>
								</Table>
							</Island>

							<div className="flex flex-col gap-6">
								<Island
									title="Zones and coverage"
									headingLevel={3}
									actions={<TextLink href="#islands">Open Riverside</TextLink>}>
									<p className="type-body text-ink">
										Coverage is compared with an illustrative target of 3 rounds per zone. Record
										abundance is not completeness.
									</p>
								</Island>
								<Island tone="danger" title="Delete organization" headingLevel={3}>
									<p className="type-body text-ink">
										Deletion must respect research-retention rules. You see every affected project,
										form and record before anything is removed.
									</p>
									<div className="mt-4">
										<Button
											variant="danger"
											icon="trash-2"
											disabled
											disabledReason="Only the owner can delete the organization.">
											Review deletion
										</Button>
									</div>
								</Island>
							</div>

							<Island title="Multi-part island" headingLevel={3} flush meta="IslandSection">
								<IslandSection>
									<p className="type-body text-ink">
										A padded part. The next part sits under a rule.
									</p>
								</IslandSection>
								<IslandSection rule>
									<FactsList
										items={[
											{ label: "Map package", value: "v3", mono: true },
											{ label: "Form", value: "demo-v1", mono: true }
										]}
									/>
								</IslandSection>
								<IslandSection rule className="flex flex-wrap gap-3">
									<Button variant="outline" icon="layers">
										Map packages
									</Button>
								</IslandSection>
							</Island>

							<Specimen
								title="Inner panels"
								caption="Inside an island: a plain panel, a dashed slot for something not there yet, and a well.">
								<Island headingLevel={3}>
									<div className="flex flex-col gap-4">
										<InnerPanel>
											<p className="type-body text-ink">An inner panel: a fine edge, no ledge.</p>
										</InnerPanel>
										<InnerPanel
											dashed
											className="flex flex-col items-center gap-2 py-8 text-center">
											<Icon name="qr-code" size={24} className="text-ink-2" />
											<p className="type-small text-ink-2">QR for the redeem link appears here</p>
										</InnerPanel>
										<InnerPanel tone="well">
											<p className="type-mono-label text-ink-2">Copy this code now</p>
											<p className="mt-1 type-mono-code text-ink">DECA2026</p>
										</InnerPanel>
									</div>
								</Island>
							</Specimen>
						</div>
					</GallerySection>

					<GallerySection
						id="notes"
						title="Notes"
						lead="A soft fill of the state's colour and its glyph. Notes are not dismissible and not clickable.">
						<div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-2">
							<Specimen title="Every tone">
								<div className="flex flex-col gap-3">
									{NOTES.map(note => (
										<Note key={note.tone} tone={note.tone} title={note.title}>
											{note.text}
										</Note>
									))}
								</div>
							</Specimen>
							<Specimen
								title="Proposals"
								caption="Every screen that previews an undecided concept carries one. The inline form sits across a page header.">
								<div className="flex flex-col gap-3">
									<ProposalNote code="U5">
										The Approved-only gate is optional and not decided.
									</ProposalNote>
									<ProposalNote code="U2" inline>
										QGIS remains the pilot&rsquo;s geometry authority. Editing a boundary here is a
										preview.
									</ProposalNote>
								</div>
							</Specimen>
						</div>
					</GallerySection>

					<GallerySection id="facts" title="Facts list">
						<div className="max-w-md">
							<Island title="Facts list" headingLevel={3} divided>
								<FactsList
									items={[
										{ label: "Version", value: "v3", mono: true },
										{ label: "Size", value: "84 MB", mono: true },
										{ label: "Imported from", value: "QGIS project export" },
										{
											label: "Observer code",
											value: <span className="font-semibold text-attention">Missing</span>
										},
										{
											label: "State",
											value: <StateBadge kind="package" state="active" size="sm" />
										}
									]}
								/>
							</Island>
						</div>
					</GallerySection>

					<GallerySection
						id="states"
						title="State badges"
						lead="Every state in contracts/contour.json: a glyph, a word and a colour, never the colour alone.">
						<StateSpecimens />
						<Specimen
							title="Sizes and qualifiers"
							caption="A qualifier follows ' · '. sm sits beside 14 px text, md beside 16 px text.">
							<div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
								<StateBadge kind="invitation" state="waiting" label="Waiting · sent Sep 30" />
								<StateBadge kind="form" state="draft" label="Draft · 2 changes" />
								<StateBadge
									kind="readiness"
									state="unknown"
									label="Unknown · AK last reported yesterday"
								/>
								<StateBadge kind="queue" state="uploaded" size="sm" label="Uploaded 11:29" />
							</div>
						</Specimen>
					</GallerySection>

					<GallerySection
						id="coverage"
						title="Coverage dots"
						lead="A filled dot for a round that met the target, a ring for one below it. Always with the fraction and a state word.">
						<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
							<Island
								title="Coverage by zone"
								flush
								headingLevel={3}
								footnote={
									<div className="flex flex-col gap-1">
										<div className="flex flex-wrap gap-x-5 gap-y-1">
											{/* The words name each dot, so the dots themselves are hidden here. */}
											<span className="inline-flex items-center gap-2">
												<span aria-hidden="true" className="inline-flex">
													<CoverageDots values={[true]} size="sm" />
												</span>
												Round met the target
											</span>
											<span className="inline-flex items-center gap-2">
												<span aria-hidden="true" className="inline-flex">
													<CoverageDots values={[false]} size="sm" />
												</span>
												Round below target
											</span>
										</div>
										<p>Target: 3 rounds per zone, 2 or more observations in each (illustrative)</p>
									</div>
								}>
								<Table caption="Coverage by zone">
									<THead>
										<tr>
											<Th>Zone</Th>
											<Th>Rounds</Th>
											<Th>On target</Th>
											<Th>Status</Th>
										</tr>
									</THead>
									<TBody>
										{ZONES.map(zone => (
											<Tr key={zone.name}>
												<Td>
													<TextLink href="#coverage" tone="ink">
														{zone.name}
													</TextLink>
												</Td>
												<Td>
													<CoverageDots values={[...zone.rounds]} />
												</Td>
												<Td mono nowrap>
													{zone.rounds.filter(Boolean).length} / {zone.rounds.length}
												</Td>
												<Td nowrap>
													<StateBadge kind="coverage" state={zone.state} size="sm" />
												</Td>
											</Tr>
										))}
									</TBody>
								</Table>
							</Island>
							<div className="flex flex-col gap-8">
								<Specimen title="Grid · six rounds" caption="Grid layout, two rows of three.">
									<CoverageDots
										values={[true, true, false, true, false, false]}
										layout="grid"
										columns={3}
									/>
								</Specimen>
								<Specimen
									title="Map tone"
									caption="Beside a map the dots take the palette's violet, passed in by the map; UI colours never reach it.">
									<span
										className="inline-flex items-center gap-3"
										style={{ color: MAP_PALETTES.day.zone.edge }}>
										<CoverageDots values={[true, true, false]} tone="map" />
										<span className="type-small text-ink">North meadow</span>
									</span>
								</Specimen>
							</div>
						</div>
					</GallerySection>

					<GallerySection id="data" title="Type bars, timeline, progress">
						<div className="grid items-start gap-6 lg:grid-cols-2">
							<Island headingLevel={3}>
								<p className="type-mono-label text-ink-2">By primary play type</p>
								<TypeBars
									className="mt-4"
									rows={[
										{ label: "Physical", value: 5 },
										{ label: "Exploratory", value: 4 },
										{ label: "Imaginative", value: 3 },
										{ label: "Restorative", value: 2 }
									]}
								/>
							</Island>
							<Island
								title="Recent field activity"
								headingLevel={3}
								actions={<TextLink href="#data">All observations</TextLink>}>
								<Timeline
									items={[
										{
											tone: "attention",
											title: "Upload rejected",
											detail: "OBS-0248 · PS · observer code missing",
											time: "11:33"
										},
										{
											tone: "uploaded",
											title: "Observation received",
											detail: "OBS-0244 · JL · Woodland edge · form demo-v1",
											time: "11:29"
										},
										{
											tone: "ink",
											title: "Map package activated",
											detail: "Riverside · map v3 · 84 MB",
											time: "Yesterday"
										},
										{
											tone: "ink",
											title: "Form draft opened",
											detail: "demo-v2 draft · nothing has been published",
											time: "Yesterday"
										}
									]}
								/>
							</Island>
							<Island title="Downloads" headingLevel={3} className="lg:col-span-2">
								<div className="grid gap-6 md:grid-cols-3">
									<ProgressBar label="Map package v4" value={60} max={126} detail="60 of 126 MB" />
									<ProgressBar label="Form demo-v2" value={0} max={2} detail="0 of 2 MB" />
									<ProgressBar label="Aerial imagery" value={41} max={41} detail="41 of 41 MB" />
								</div>
							</Island>
						</div>
					</GallerySection>

					<GallerySection id="identity" title="Avatars, role label, keys">
						<div className="grid gap-x-12 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
							<Specimen
								title="Avatars"
								caption="Initials only. Ink for the signed-in account, well in lists.">
								<div className="flex items-center gap-3">
									<Avatar initials="PS" size="sm" />
									<Avatar initials="JL" size="md" />
									<Avatar initials="AK" size="lg" />
									<Avatar initials="PS" size="lg" tone="ink" label="Account, Pratyush Sudhakar" />
								</div>
							</Specimen>
							<Specimen title="Header cluster">
								<div className="flex items-center gap-3">
									<RoleLabel>Manager</RoleLabel>
									<Avatar initials="PS" size="lg" tone="ink" />
								</div>
							</Specimen>
							<Specimen title="Keys" caption="The search hint reads ⌘K on a Mac and Ctrl K elsewhere.">
								<div className="flex flex-wrap items-center gap-2">
									<ShortcutHint />
									<Kbd>j</Kbd>
									<Kbd>k</Kbd>
									<Kbd>Esc</Kbd>
								</div>
							</Specimen>
							<Specimen title="Mono">
								<div className="flex flex-col gap-2">
									<Mono>OBS-0248 · MAP v3 · FORM demo-v1</Mono>
									<Mono variant="label">Next observation</Mono>
									<Mono variant="title">OBS-0244</Mono>
								</div>
							</Specimen>
						</div>
					</GallerySection>

					<GallerySection
						id="inputs"
						title="Inputs"
						lead="Every input sits in a Field: a label above, then one message row with the hint, error or check, and a counter.">
						<InputsDemo />
					</GallerySection>

					<GallerySection id="navigation" title="Navigation">
						<NavigationDemo />
					</GallerySection>

					<GallerySection
						id="table"
						title="Table"
						lead="One tab stop. ↑ / ↓ or j / k move the selection, Home and End jump, Enter opens the row.">
						<TableDemo />
					</GallerySection>

					<GallerySection
						id="screen-states"
						title="Screen states"
						lead="Each state replaces an island's content and keeps the page around it. Plain words, one icon, no illustration.">
						<div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
							<Specimen title="Loading" caption="Still placeholders, shown only after 400 ms.">
								<Island flush>
									<ScreenState kind="loading" headingLevel={4} />
								</Island>
							</Specimen>
							<Specimen title="Empty after filtering">
								<Island flush>
									<ScreenState
										kind="filtered"
										headingLevel={4}
										actions={
											<>
												<Button variant="ink" icon="x">
													Clear filters
												</Button>
												<Button variant="outline">Open saved views</Button>
											</>
										}
									/>
								</Island>
							</Specimen>
							<Specimen title="Empty, nothing made yet">
								<Island flush>
									<ScreenState
										kind="empty"
										headingLevel={4}
										actions={<Button icon="upload">Upload package</Button>}
									/>
								</Island>
							</Specimen>
							<Specimen title="Error">
								<Island flush>
									<ScreenState
										kind="error"
										headingLevel={4}
										actions={
											<>
												<Button variant="ink" icon="rotate-cw">
													Try again
												</Button>
												<Button variant="outline">Return to projects</Button>
											</>
										}
									/>
								</Island>
							</Specimen>
							<Specimen title="Offline">
								<Island flush>
									<ScreenState
										kind="offline"
										loadedAt="11:36"
										actions={
											<>
												<Button
													variant="ink"
													icon="check"
													disabled
													disabledReason="Approving needs a connection.">
													Approve
												</Button>
												<Button variant="outline" icon="rotate-cw">
													Retry connection
												</Button>
											</>
										}>
										<Table caption="Observations loaded before going offline">
											<TBody>
												{OFFLINE_ROWS.map(row => (
													<Tr key={row.id}>
														<Td mono nowrap>
															{row.id}
														</Td>
														<Td>{row.zone}</Td>
														<Td nowrap>
															<StateBadge kind="review" state={row.review} size="sm" />
														</Td>
													</Tr>
												))}
											</TBody>
										</Table>
									</ScreenState>
								</Island>
							</Specimen>
							<Specimen title="No access">
								<Island flush>
									<ScreenState
										kind="no-access"
										headingLevel={4}
										actions={
											<Button variant="ink" icon="arrow-left">
												Return to projects
											</Button>
										}
									/>
								</Island>
							</Specimen>
						</div>
					</GallerySection>

					<GallerySection
						id="feedback"
						title="Feedback"
						lead="Overlays open from real controls. The toast confirms a change and offers Undo.">
						<FeedbackDemo />
					</GallerySection>

					<GallerySection
						id="maps"
						title="Maps"
						lead="Site plans in the map palette, not the screen theme. Zoom with + and −, pan with the arrows once zoomed, select a marker.">
						<MapSpecimens />
					</GallerySection>
				</main>
			</TooltipProvider>
		</ToastProvider>
	);
}
