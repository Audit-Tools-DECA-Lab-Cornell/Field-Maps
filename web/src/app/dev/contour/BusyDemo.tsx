"use client";

import { useState } from "react";

import { Button, Switch } from "@/components/contour";

/**
 * Buttons in their busy state, switched by hand rather than by a timer, so the label swap can be read
 * at leisure and the gallery never fakes a wait.
 */
export function BusyDemo() {
	const [busy, setBusy] = useState(false);
	return (
		<div className="flex flex-col gap-4">
			<Switch
				id="gallery-busy"
				checked={busy}
				onCheckedChange={setBusy}
				label="Busy"
				description="The label changes in place; width and focus stay, presses are ignored, aria-busy is set."
				className="max-w-md"
			/>
			<div className="flex flex-wrap items-center gap-3">
				<Button icon="upload" busy={busy} busyLabel="Uploading 1 of 3">
					Upload now
				</Button>
				<Button variant="ink" busy={busy} busyLabel="Verifying email…">
					Verify email
				</Button>
				<Button variant="outline" icon="check" busy={busy} busyLabel="Saving view…">
					Save view
				</Button>
			</div>
		</div>
	);
}
