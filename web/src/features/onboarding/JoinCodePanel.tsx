"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { Mono } from "@/components/contour/Mono";
import { useToast } from "@/components/contour/Toast";
import { MOTION } from "@/lib/contour";

export type JoinCodePanelProps = {
	/** Empty until the browser has made one (it is never made on the server). */
	code: string;
	onRotate: () => void;
};

/**
 * The observer join code, as the Team page shows it (project-04), here as a preview: it is made in this
 * browser and not registered, so the panel says it cannot be redeemed yet. "Copy code" reads "Copied ✓"
 * for the contract's copied duration.
 */
export function JoinCodePanel({ code, onRotate }: JoinCodePanelProps) {
	const { toast } = useToast();
	const [copied, setCopied] = useState(false);
	const timer = useRef<number | undefined>(undefined);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	async function copy() {
		if (code === "") return;
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => setCopied(false), MOTION.copied);
		} catch {
			toast({
				title: "The code was not copied",
				description: "This browser did not allow it. Select the code and copy it by hand.",
				tone: "attention"
			});
		}
	}

	function rotate() {
		setCopied(false);
		onRotate();
		toast({
			title: "New preview code",
			description: "The old code was never registered, so nothing stops working."
		});
	}

	return (
		<section aria-labelledby="join-code-title" className="mt-2 flex flex-col gap-4 border-t border-line pt-8">
			<InnerPanel tone="well" className="flex flex-col gap-2">
				<h2 id="join-code-title" className="type-mono-label text-ink-2">
					Observer join code
				</h2>
				<Mono variant="code" className="wrap-anywhere text-ink" aria-live="polite">
					{code === "" ? <span className="text-ink-2">--------</span> : code}
				</Mono>
				<p className="type-body text-ink-2">
					Observers enter it in the app. They see the project before joining.
				</p>
			</InnerPanel>
			<div className="flex flex-wrap gap-3">
				<Button variant="ink" icon={copied ? undefined : "copy"} onClick={copy}>
					{copied ? "Copied ✓" : "Copy code"}
				</Button>
				<Button variant="outline" icon="rotate-cw" onClick={rotate}>
					Rotate code
				</Button>
				<span role="status" className="sr-only">
					{copied ? "Code copied" : ""}
				</span>
			</div>
			<p className="type-small text-ink-2">
				A preview code made in this browser. It is not registered, so it cannot be redeemed yet. The live code
				is shown once, when the project is created.
			</p>
		</section>
	);
}
