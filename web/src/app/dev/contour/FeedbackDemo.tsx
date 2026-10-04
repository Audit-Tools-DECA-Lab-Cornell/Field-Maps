"use client";

import { useState } from "react";

import {
	Button,
	Dialog,
	DialogClose,
	FactsList,
	IconButton,
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSeparator,
	MenuTrigger,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Tooltip,
	useToast
} from "@/components/contour";
import type { ThemeName } from "@/lib/contour";
import { useTheme } from "@/lib/theme";

import { Specimen } from "./GalleryParts";

/** Overlays and the toast, each opened by a real control. Nothing here leaves the page or claims to. */
export function FeedbackDemo() {
	const toast = useToast();
	const [theme, setTheme] = useTheme();
	const [exportOpen, setExportOpen] = useState(false);
	const [review, setReview] = useState<"not reviewed" | "approved" | "excluded">("not reviewed");

	function approve() {
		setReview("approved");
		toast({
			title: "OBS-0244 approved",
			tone: "saved",
			action: {
				label: "Undo",
				altText: "Undo with ⌘Z",
				onClick: () => setReview("not reviewed")
			}
		});
	}

	function exclude() {
		setReview("excluded");
		toast({
			title: "OBS-0244 excluded",
			tone: "attention",
			action: { label: "Undo", onClick: () => setReview("not reviewed") }
		});
	}

	return (
		<div className="grid gap-x-12 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
			<Specimen
				title="Toast"
				caption={`One at a time, announced politely, never takes focus. It stays six seconds and pauses on hover or focus. OBS-0244 is ${review}.`}>
				<div className="flex flex-wrap gap-3">
					<Button variant="ink" icon="check" onClick={approve}>
						Approve
					</Button>
					<Button variant="outline" icon="x" onClick={exclude}>
						Exclude
					</Button>
					<Button variant="outline" onClick={() => toast({ title: "Filters cleared · 14 of 14 shown" })}>
						Show a neutral toast
					</Button>
				</div>
			</Specimen>

			<Specimen
				title="Dialog"
				caption="Focus moves in and is trapped; Esc or the scrim closes it, and focus returns to the button.">
				<div>
					<Dialog
						open={exportOpen}
						onOpenChange={setExportOpen}
						trigger={
							<Button variant="outline" icon="download">
								Export current view
							</Button>
						}
						title="Export this view"
						description="The export repeats the scope on screen, so the file holds what the table shows."
						footer={
							<>
								<DialogClose asChild>
									<Button variant="outline">Cancel</Button>
								</DialogClose>
								<Button
									icon="download"
									onClick={() => {
										setExportOpen(false);
										toast({ title: "Gallery only: nothing was exported" });
									}}>
									Export CSV
								</Button>
							</>
						}>
						<FactsList
							items={[
								{ label: "Site", value: "Riverside" },
								{ label: "Zones", value: "All three" },
								{ label: "Records", value: "14 of 14", mono: true },
								{ label: "Format", value: "CSV, one row per observation" }
							]}
						/>
					</Dialog>
				</div>
			</Specimen>

			<Specimen
				title="Menu"
				caption="44 px items, typeahead, a check on the current choice. The theme choice here switches the page.">
				<div>
					<Menu>
						<MenuTrigger asChild>
							<Button variant="outline" iconRight="chevron-down">
								Record actions
							</Button>
						</MenuTrigger>
						<MenuContent align="start">
							<MenuLabel>OBS-0244</MenuLabel>
							<MenuItem icon="check" shortcut="a" onSelect={approve}>
								Approve
							</MenuItem>
							<MenuItem icon="x" shortcut="x" onSelect={exclude}>
								Exclude
							</MenuItem>
							<MenuSeparator />
							<MenuLabel>Screen</MenuLabel>
							<MenuRadioGroup value={theme} onValueChange={value => setTheme(value as ThemeName)}>
								<MenuRadioItem value="day" icon="sun">
									Day
								</MenuRadioItem>
								<MenuRadioItem value="dusk" icon="moon">
									Dusk
								</MenuRadioItem>
							</MenuRadioGroup>
							<MenuSeparator />
							<MenuItem
								icon="trash-2"
								tone="danger"
								onSelect={() => toast({ title: "Gallery only: nothing was deleted" })}>
								Delete draft
							</MenuItem>
						</MenuContent>
					</Menu>
				</div>
			</Specimen>

			<Specimen title="Popover" caption="Free content on the menu surface: the Preview data note.">
				<div>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" icon="info">
								Preview data
							</Button>
						</PopoverTrigger>
						<PopoverContent align="start">
							Everything here is sample data. Nothing is read from or written to the FieldMaps database.
						</PopoverContent>
					</Popover>
				</div>
			</Specimen>

			<Specimen
				title="Tooltip"
				caption="Names a control on hover after 400 ms, or at once on focus. It never holds a reason the reader needs.">
				<div className="flex gap-3">
					<Tooltip content="Copy code">
						<IconButton icon="copy" label="Copy code" variant="outline" />
					</Tooltip>
					<Tooltip content="Print the report" side="bottom">
						<IconButton icon="printer" label="Print the report" variant="outline" />
					</Tooltip>
				</div>
			</Specimen>
		</div>
	);
}
