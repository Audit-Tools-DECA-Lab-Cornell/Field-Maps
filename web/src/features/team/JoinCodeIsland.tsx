"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Icon } from "@/components/contour/Icon";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";
import { StateBadge } from "@/components/contour/StateBadge";
import { useToast } from "@/components/contour/Toast";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { MOTION } from "@/lib/contour";
import { download } from "@/lib/exports";

import { newJoinCode, type Team } from "./store";

export type JoinCodeIslandProps = {
	team: Team;
	projectName: string;
	orgName: string;
};

function instructions(code: string, projectName: string, orgName: string): string {
	return [
		"FieldMaps observer join code",
		"",
		`Project: ${projectName} (${orgName})`,
		`Code: ${code}`,
		"",
		"How to join:",
		"1. Open the FieldMaps app and sign in.",
		"2. Choose Join a project and enter the code.",
		"3. Check the project name, then join. You see the project before joining.",
		"",
		"Keep this code with the observers who need it. A project manager can rotate it; the old code then stops working.",
		""
	].join("\n");
}

/**
 * The observer join code (project-04), shown once. Copy reads "Copied" for the contract's copied
 * duration; Download saves a text file with the code and how to use it; Dismiss asks first, then the
 * island collapses to "Code dismissed" with Rotate code, which shows a new code once.
 */
export function JoinCodeIsland({ team, projectName, orgName }: JoinCodeIslandProps) {
	const { toast } = useToast();
	const { screenState, offline } = usePreview();
	const [copied, setCopied] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [announcement, setAnnouncement] = useState("");
	const timer = useRef<number | undefined>(undefined);
	const copyRef = useRef<HTMLButtonElement>(null);
	const rotateRef = useRef<HTMLButtonElement>(null);
	const focusNext = useRef<"copy" | "rotate" | null>(null);
	const live = screenState === "normal" || screenState === "offline";
	const code = team.code;

	useEffect(() => () => window.clearTimeout(timer.current), []);

	// After dismissing or rotating, focus lands on the action that replaced the one pressed.
	useEffect(() => {
		if (focusNext.current === "copy") copyRef.current?.focus();
		if (focusNext.current === "rotate") rotateRef.current?.focus();
		focusNext.current = null;
	}, [code]);

	async function copy() {
		if (!code) return;
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setAnnouncement(`Join code ${code} copied`);
			window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => {
				setCopied(false);
				setAnnouncement("");
			}, MOTION.copied);
		} catch {
			toast({
				title: "The code was not copied",
				description: "This browser did not allow it. Select the code and copy it by hand.",
				tone: "attention"
			});
		}
	}

	function save() {
		if (!code) return;
		download(`${code}.txt`, "text/plain;charset=utf-8", instructions(code, projectName, orgName));
	}

	function dismiss() {
		if (!code) return;
		focusNext.current = "rotate";
		setConfirming(false);
		setCopied(false);
		team.update(current => ({ ...current, code: { value: code, dismissed: true } }));
		toast({ title: "Join code dismissed", description: "It still works for observers who have it." });
	}

	function rotate() {
		focusNext.current = "copy";
		team.update(current => ({ ...current, code: { value: newJoinCode(), dismissed: false } }));
		toast({
			title: "New join code made in this preview",
			description: "It is shown once. Nothing is registered, so no code stops working."
		});
	}

	return (
		<Island
			flush
			title="Observer join code"
			meta={
				live && code ? <StateBadge kind="review" state="notReviewed" label="Shown once" size="sm" /> : undefined
			}>
			<PreviewStateView
				loadingLabel="Loading the join code…"
				rows={2}
				headingLevel={3}
				empty={{
					icon: "qr-code",
					title: "No join code yet",
					body: "A join code lets observers find this project in the app. Rotate one to show it once."
				}}>
				<div className="flex flex-col gap-4 px-island-pad py-5">
					{code ? (
						<>
							<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
								<InnerPanel tone="well" className="flex flex-col gap-1 p-5">
									<Mono variant="label" as="p" className="text-ink-2">
										Copy this code now
									</Mono>
									<Mono variant="code" as="p" className="wrap-anywhere text-ink">
										{code}
									</Mono>
									<p className="mt-1 type-body text-ink-2">
										Observers enter it in the app. They see the project before joining.
									</p>
								</InnerPanel>
								<InnerPanel
									dashed
									className="flex flex-col items-center justify-center gap-2 text-center">
									<Icon name="qr-code" size={28} className="text-ink-2" />
									<p className="type-small text-ink-2">QR for the redeem link appears here</p>
									<StateBadge kind="proposal" state="open" label="Proposal U3" size="sm" />
								</InnerPanel>
							</div>
							<div className="flex flex-wrap gap-3">
								<Button ref={copyRef} variant="ink" icon={copied ? "check" : "copy"} onClick={copy}>
									{copied ? "Copied" : "Copy code"}
								</Button>
								<Button variant="outline" icon="download" onClick={save}>
									Download code
								</Button>
								<Dialog
									open={confirming}
									onOpenChange={setConfirming}
									title="Dismiss the join code?"
									description="You will not see this code again. Rotate it to create a new one."
									trigger={
										<Button variant="outline" disabled={offline}>
											Dismiss
										</Button>
									}
									footer={
										<>
											<DialogClose asChild>
												<Button variant="outline">Keep showing it</Button>
											</DialogClose>
											<Button onClick={dismiss}>Dismiss code</Button>
										</>
									}>
									<p className="type-body text-ink">
										The code keeps working for observers who already have it. Copy or download it
										first if you still need to share it.
									</p>
								</Dialog>
							</div>
							<p className="type-small text-ink-2">
								After you dismiss it the code is never shown again. Rotate it to create a new one; the
								old code stops working.
							</p>
						</>
					) : (
						<div className="flex flex-col items-start gap-4">
							<div>
								<p className="type-body font-semibold text-ink">
									{team.codeDismissed ? "Code dismissed" : "No code is showing"}
								</p>
								<p className="mt-1 type-body text-ink-2">
									{team.codeDismissed
										? "It still works for observers who have it. Rotate it to stop it and show a new code once."
										: "Rotate a code to let observers join from the app. It is shown once."}
								</p>
							</div>
							<Button
								ref={rotateRef}
								variant="outline"
								icon="rotate-cw"
								disabled={offline}
								onClick={rotate}>
								Rotate code
							</Button>
						</div>
					)}
					<span role="status" className="sr-only">
						{announcement}
					</span>
				</div>
			</PreviewStateView>
		</Island>
	);
}
