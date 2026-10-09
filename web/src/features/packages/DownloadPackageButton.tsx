"use client";

import { useState } from "react";

import { Button, type ButtonVariant } from "@/components/contour/Button";
import { Note } from "@/components/contour/Note";
import { downloadPackageArchive } from "@/lib/api/browser";
import { apiRequestError } from "@/lib/api/errors";
import { packageFileName } from "@/lib/download";

/**
 * Download a ready map package as a zip, from the browser. The file is named from the site code and the
 * version (`fall-creek-map-v3.zip`), and its contents are checked against the digest FieldMaps recorded
 * when it prepared the package.
 */
export function DownloadPackageButton({
	projectId,
	packageId,
	siteCode,
	version,
	variant = "outline"
}: {
	projectId: string;
	packageId: string;
	siteCode: string;
	version: number;
	variant?: ButtonVariant;
}) {
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState<string | null>(null);

	async function download() {
		setBusy(true);
		setProblem(null);
		try {
			await downloadPackageArchive(projectId, packageId, packageFileName(siteCode, version));
		} catch (error) {
			setProblem(apiRequestError(error).message);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex min-w-0 flex-col items-start gap-3">
			<Button
				variant={variant}
				icon="download"
				busy={busy}
				busyLabel="Downloading…"
				onClick={() => void download()}>
				Download
			</Button>
			{problem && (
				<Note tone="attention" title="Nothing was downloaded." live="assertive">
					{problem}
				</Note>
			)}
		</div>
	);
}
