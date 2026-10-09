/**
 * Saving a file the browser made or fetched. Browser-only: call these from event handlers in client
 * components. The object URL is released after the download has had time to start; revoking it at once
 * cancels the download in some browsers.
 */

const RELEASE_AFTER_MS = 10_000;

export function saveBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.rel = "noopener";
	anchor.style.display = "none";
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), RELEASE_AFTER_MS);
}

export function saveText(text: string, fileName: string, mime: string): void {
	saveBlob(new Blob([text], { type: mime.includes("charset") ? mime : `${mime};charset=utf-8` }), fileName);
}

/** "fall-creek-map-v3.zip": a map package's file name from its site code and version. */
export function packageFileName(siteCode: string, version: number): string {
	return `${siteCode}-map-v${version}.zip`;
}
