"use client";

import { Fragment } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Kbd, ShortcutHint } from "@/components/contour/Kbd";
import { useShell } from "@/features/shell/ShellProvider";
import { SHORTCUT_GROUPS, type ShortcutRow } from "@/lib/shortcuts";

function Keys({ row }: { row: ShortcutRow }) {
	if (row.keys[0] === "mod+k") return <ShortcutHint />;
	return (
		<span className="inline-flex flex-wrap items-center justify-end gap-1.5 type-small text-ink-2">
			{row.keys.map((key, index) => (
				<Fragment key={key}>
					{index > 0 && <span>{row.sequence ? "then" : "or"}</span>}
					<Kbd>{key}</Kbd>
				</Fragment>
			))}
		</span>
	);
}

/** Every workspace shortcut, opened with `?`, from the account menu or from the palette. */
export function ShortcutsDialog() {
	const { shortcutsOpen, setShortcutsOpen } = useShell();
	return (
		<Dialog
			open={shortcutsOpen}
			onOpenChange={setShortcutsOpen}
			size="lg"
			title="Keyboard shortcuts"
			description="Shortcuts wait while you type in a field or while a dialog is open."
			footer={
				<DialogClose asChild>
					<Button variant="outline">Close shortcuts</Button>
				</DialogClose>
			}>
			<div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
				{SHORTCUT_GROUPS.map(group => (
					<section key={group.title} aria-label={group.title}>
						<h3 className="type-mono-label text-ink-2">{group.title}</h3>
						<dl className="mt-1 divide-y divide-rule">
							{group.rows.map(row => (
								<div
									key={`${row.keys.join("+")}-${row.label}`}
									className="flex items-center justify-between gap-4 py-2">
									<dt className="type-body">{row.label}</dt>
									<dd>
										<Keys row={row} />
									</dd>
								</div>
							))}
						</dl>
					</section>
				))}
			</div>
		</Dialog>
	);
}
