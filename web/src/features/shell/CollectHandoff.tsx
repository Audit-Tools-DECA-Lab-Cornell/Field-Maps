"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { ProposalNote } from "@/components/contour/ProposalNote";
import { getProject, JOIN_CODE } from "@/fixtures";
import { MOTION } from "@/lib/contour";

/** "Copy code" reads "Copied ✓" for the contract's copied duration, then returns. */
function CopyCode({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);
	const [failed, setFailed] = useState(false);
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			setFailed(false);
			setCopied(true);
			window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => setCopied(false), MOTION.copied);
		} catch {
			setFailed(true);
		}
	}

	return (
		<div className="flex flex-col items-start gap-2">
			<Button variant="ink" icon="copy" onClick={copy}>
				{copied ? "Copied ✓" : "Copy code"}
			</Button>
			<span role="status" className="sr-only">
				{copied ? "Code copied" : ""}
			</span>
			{failed && (
				<p role="status" className="type-small text-ink-2">
					This browser did not allow copying. Select the code and copy it by hand.
				</p>
			)}
		</div>
	);
}

/**
 * Where an observer who signs in on the web is sent (proposal U3): collection happens in the mobile
 * collector, so the page says how to get it and how to join. Phase 5 builds it out to org-14.
 */
export function CollectHandoff() {
	const project = getProject("deca", JOIN_CODE.projectSlug);
	const projectName = project?.name ?? "the project";

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Collect on your phone"
				lead="Your observer role gives you access to field collection, not management settings."
			/>
			<ProposalNote code="U3" inline>
				This handoff page for observers who sign in on the web is not decided yet.
			</ProposalNote>
			<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
				<Island title="Get the collector">
					<ol className="flex list-decimal flex-col gap-2 pl-6 type-body marker:text-ink-2">
						<li>Install the FieldMaps collector on your phone or tablet.</li>
						<li>Sign in with the address you use here.</li>
						<li>Open your invitation on the phone, or join with the code on this page.</li>
						<li>Download a site while you have signal.</li>
						<li>Collect offline. Records upload when the app is open and connected.</li>
					</ol>
					<p className="mt-5 type-small text-ink-2">
						Store links and the install QR code appear after the first signed app release. Nothing here
						points to a store that does not exist yet.
					</p>
				</Island>
				<Island title={`Join ${projectName}`}>
					<InnerPanel tone="well" className="flex flex-col gap-1">
						<Mono variant="label" className="text-ink-2">
							Observer join code
						</Mono>
						<Mono variant="code" className="text-ink">
							{JOIN_CODE.code}
						</Mono>
					</InnerPanel>
					<p className="mt-4 type-body text-ink-2">
						In the collector, choose Join a project and enter this code.
					</p>
					<div className="mt-5">
						<CopyCode code={JOIN_CODE.code} />
					</div>
				</Island>
			</div>
			<Note>
				Observers collect in the FieldMaps mobile app. This web workspace is for managers, viewers and
				organization admins.
			</Note>
		</div>
	);
}
