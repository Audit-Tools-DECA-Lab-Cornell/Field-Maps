import Image from "next/image";
import Link from "next/link";

import { RailNav } from "@/components/app-shell/RailNav";
import { Chip, StatusFooter } from "@/components/nocturne/chrome";
import { BASEMAP_PACKAGES } from "@/data/basemaps";
import { BLOCKING_FLAGS, FORM_VERSIONS } from "@/data/instrument";
import { OBSERVATIONS } from "@/data/observations";
import { ORGANIZATION, PROJECT, QGIS_LAYERS, SITES, VIEWER } from "@/data/project";
import { formatCount } from "@/lib/format";

/**
 * The workspace frame: identity and project along the top, the sections down the left, one status
 * line along the bottom. It is the collector's own frame at desk scale — the collector gives each
 * screen its own back affordance and keeps the last thing that happened readable along the bottom
 * edge, and so does this.
 */
export default function WorkspaceLayout({ children }: { readonly children: React.ReactNode }) {
	const counts: Record<string, string> = {
		"/observations": formatCount(OBSERVATIONS.length),
		"/places": formatCount(SITES.length),
		"/instrument": `${formatCount(FORM_VERSIONS.length)} · ${formatCount(BLOCKING_FLAGS.length)} ⚠`,
		"/basemaps": formatCount(BASEMAP_PACKAGES.length),
		"/qgis": formatCount(QGIS_LAYERS.length)
	};

	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-bg">
			<a
				href="#workspace-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-snug focus:left-snug focus:z-50 focus:rounded-md focus:bg-raised focus:px-base focus:py-snug focus:text-detail focus:text-text">
				Skip to content
			</a>

			<header className="flex shrink-0 flex-wrap items-center gap-x-loose gap-y-tight border-b border-edge px-loose py-snug">
				<Link href="/" className="flex min-h-9 shrink-0 items-center gap-snug rounded-md">
					<Image src="/icons/icon.svg" alt="" width={24} height={24} unoptimized className="rounded-[22%]" />
					<span className="text-body font-medium text-text" translate="no">
						FieldMaps
					</span>
				</Link>

				<span aria-hidden className="hidden h-4 w-px shrink-0 bg-edge sm:block" />

				<div className="flex min-w-0 shrink items-baseline gap-snug">
					<span className="truncate text-detail text-neutral-300">{PROJECT.name}</span>
					<span className="hidden truncate text-micro text-neutral-600 sm:inline">{ORGANIZATION.name}</span>
				</div>

				<div className="ml-auto flex shrink-0 items-center gap-snug">
					<Chip tone="attention" glyph="◼">
						Local fixtures
					</Chip>
					<span className="hidden text-micro text-neutral-500 md:inline">
						{VIEWER.name} · {VIEWER.role}
					</span>
				</div>
			</header>

			<div className="flex min-h-0 flex-1 flex-col md:flex-row">
				<aside className="shrink-0 border-b border-edge bg-surface md:w-[188px] md:overflow-y-auto md:border-r md:border-b-0">
					<RailNav counts={counts} />
				</aside>

				<main id="workspace-content" className="flex min-h-0 min-w-0 flex-1 flex-col">
					{children}
				</main>
			</div>

			<StatusFooter>
				Reading local fixtures. Nothing on these screens has been written to, or read from, the hosted database.
			</StatusFooter>
		</div>
	);
}
