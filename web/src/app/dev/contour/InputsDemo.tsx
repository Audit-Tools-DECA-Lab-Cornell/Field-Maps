"use client";

import { useState } from "react";

import {
	AnswerTile,
	Checkbox,
	CodeInput,
	Field,
	InnerPanel,
	NumberStepper,
	PasswordInput,
	RadioRows,
	Segmented,
	Select,
	Switch,
	Textarea,
	TextInput
} from "@/components/contour";
import { CodeCounter } from "@/components/contour/CodeCounter";

import { Specimen } from "./GalleryParts";

const DESCRIPTION = "Play observed along the woodland edge during the morning round, near the log circle.";

const ANSWERS = [
	"Physical",
	"Exploratory",
	"Play with Rules",
	"Non-Play",
	"LARGE Natural Loose Parts",
	"Restorative",
	"A longer option label wraps onto a second line without hiding its meaning"
];

/** Every field state from system-04 and the auth screens, live: type, toggle and choose to see each change. */
export function InputsDemo() {
	const [projectName, setProjectName] = useState("Play Study");
	const [initials, setInitials] = useState("");
	const [password, setPassword] = useState("riverside-meadow");
	const [answerFormat, setAnswerFormat] = useState("single");
	const [search, setSearch] = useState("");
	const [description, setDescription] = useState(DESCRIPTION);
	const [otp, setOtp] = useState("4829");
	const [joinCode, setJoinCode] = useState("DECA2026");
	const [haptics, setHaptics] = useState(true);
	const [largerText, setLargerText] = useState(false);
	const [required, setRequired] = useState(true);
	const [privacy, setPrivacy] = useState(false);
	const [hand, setHand] = useState("right");
	const [view, setView] = useState("map");
	const [zone, setZone] = useState("north-meadow");
	const [answer, setAnswer] = useState("Physical");
	const [rounds, setRounds] = useState(3);

	const initialsValid = /^[A-Z]{1,10}$/.test(initials);
	const passwordLong = password.length >= 8;

	return (
		<div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
			<Specimen title="Text, error, read-only, select">
				<div className="flex max-w-md flex-col gap-6">
					<Field
						label="Project name"
						htmlFor="gallery-project-name"
						hint="Short and unique. It appears in export file names.">
						<TextInput value={projectName} onChange={event => setProjectName(event.target.value)} />
					</Field>
					<Field
						label="Observer initials"
						htmlFor="gallery-initials"
						error={initialsValid ? undefined : "Enter up to 10 uppercase characters"}>
						<TextInput
							value={initials}
							placeholder="e.g. PS"
							autoComplete="off"
							onChange={event => setInitials(event.target.value)}
						/>
					</Field>
					<Field
						label="New password"
						htmlFor="gallery-password"
						success={passwordLong ? `${password.length} characters` : undefined}
						hint="Use at least 8.">
						<PasswordInput
							value={password}
							autoComplete="new-password"
							onChange={event => setPassword(event.target.value)}
						/>
					</Field>
					<Field
						label="Field identifier"
						htmlFor="gallery-identifier"
						hint="Read-only. Stable across wording edits.">
						<TextInput value="age_range" readOnly className="font-mono" />
					</Field>
					<Field label="Answer format" htmlFor="gallery-answer-format">
						<Select value={answerFormat} onChange={event => setAnswerFormat(event.target.value)}>
							<option value="single">Single choice</option>
							<option value="multiple">Multiple choice</option>
							<option value="text">Short text</option>
							<option value="number">Number</option>
						</Select>
					</Field>
					<Field label="Search" htmlFor="gallery-search" optional>
						<TextInput
							type="search"
							leadingIcon="search"
							placeholder="Search or jump to"
							value={search}
							onChange={event => setSearch(event.target.value)}
						/>
					</Field>
					<Field label="Description" htmlFor="gallery-description" hint="Saved to the draft as you type">
						<Textarea
							showCount
							maxLength={1000}
							value={description}
							onChange={event => setDescription(event.target.value)}
						/>
					</Field>
					<Field
						label="Verification code"
						htmlFor="gallery-otp"
						hint="Sent to ps@example.org."
						counter={<CodeCounter value={otp} length={6} />}>
						<CodeInput id="gallery-otp" kind="otp" length={6} value={otp} onChange={setOtp} />
					</Field>
					<Field
						label="Join code"
						htmlFor="gallery-join"
						hint="Letters and digits. Spaces and dashes are removed."
						counter={<CodeCounter value={joinCode} length={8} />}>
						<CodeInput id="gallery-join" kind="join" length={8} value={joinCode} onChange={setJoinCode} />
					</Field>
				</div>
			</Specimen>

			<div className="flex flex-col gap-10">
				<Specimen
					title="Switch, checkbox, segmented"
					caption="A switch always shows On or Off as a word beside the track.">
					<div className="flex max-w-md flex-col gap-6">
						<InnerPanel flush className="divide-y divide-rule">
							<Switch
								id="gallery-haptics"
								checked={haptics}
								onCheckedChange={setHaptics}
								label="Haptics on save"
								description="A short tap when a record is stored."
								className="px-4 py-3"
							/>
							<Switch
								id="gallery-larger-text"
								checked={largerText}
								onCheckedChange={setLargerText}
								label="Larger question text"
								description="Adds to the device text size."
								className="px-4 py-3"
							/>
						</InnerPanel>
						<div className="flex flex-col gap-3">
							<Checkbox id="gallery-required" checked={required} onCheckedChange={setRequired}>
								Required when visible
							</Checkbox>
							<Checkbox
								id="gallery-privacy"
								checked={privacy}
								onCheckedChange={setPrivacy}
								description="It says what is stored, where, and for how long.">
								I have read the privacy information
							</Checkbox>
							<Checkbox
								id="gallery-disabled-check"
								checked={false}
								onCheckedChange={() => {}}
								disabled
								description="Published versions cannot change. Open a draft to edit it.">
								Allow a free-text answer
							</Checkbox>
						</div>
						<Segmented
							label="Preferred hand"
							value={hand}
							onValueChange={setHand}
							options={[
								{ value: "left", label: "Left hand" },
								{ value: "right", label: "Right hand" }
							]}
						/>
						<Segmented
							label="Data view"
							size="lg"
							fullWidth
							value={view}
							onValueChange={setView}
							options={[
								{ value: "map", label: "Map", icon: "map" },
								{ value: "table", label: "Table", icon: "table" },
								{ value: "both", label: "Both", icon: "layout-grid" }
							]}
						/>
					</div>
				</Specimen>

				<Specimen
					title="Radio rows · short lists"
					caption="Used for the zone in the session brief. Soft fill and a filled dot when chosen.">
					<RadioRows
						label="Zone"
						value={zone}
						onValueChange={setZone}
						className="max-w-md"
						options={[
							{ value: "north-meadow", label: "North meadow" },
							{ value: "woodland-edge", label: "Woodland edge", description: "7 observations so far" },
							{ value: "sand-area", label: "Sand area" }
						]}
					/>
				</Specimen>

				<Specimen
					title="Answer tiles · 60 px or taller"
					caption="Long labels grow the tile; nothing truncates.">
					<div role="group" aria-label="Primary play type" className="grid max-w-md grid-cols-2 gap-3">
						{ANSWERS.map(label => (
							<AnswerTile
								key={label}
								selected={answer === label}
								onClick={() => setAnswer(label)}
								className={label.length > 30 ? "col-span-2" : undefined}>
								{label}
							</AnswerTile>
						))}
					</div>
				</Specimen>

				<Specimen title="Number stepper">
					<Field
						label="Rounds per zone"
						htmlFor="gallery-rounds"
						hint={rounds === 6 ? "Six is the most a protocol allows." : "Between 1 and 6."}>
						<NumberStepper label="Rounds per zone" value={rounds} onChange={setRounds} min={1} max={6} />
					</Field>
				</Specimen>
			</div>
		</div>
	);
}
