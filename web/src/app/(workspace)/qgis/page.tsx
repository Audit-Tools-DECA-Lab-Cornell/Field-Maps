import { PageHeader } from "@/components/app-shell/PageHeader";
import { AttentionNote, Chip, FadeRule, FieldRow, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { CopyField } from "@/components/qgis/CopyField";
import { QGIS_CONNECTION, QGIS_LAYERS } from "@/data/project";
import { plural } from "@/lib/format";

export const metadata = { title: "QGIS" };

/**
 * The integration that is already real, and is therefore the shortest screen in the application:
 * QGIS reads the same database the collector writes to. There is no upload step between them and
 * no “send to QGIS” button to build.
 */
export default function QgisPage() {
	const uri = `postgresql://${QGIS_CONNECTION.user}@${QGIS_CONNECTION.host}:${QGIS_CONNECTION.port}/${QGIS_CONNECTION.database}?sslmode=${QGIS_CONNECTION.sslMode}`;

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<PageHeader
				kicker="Integration"
				title="QGIS reads the same database"
				lead="Add the PostGIS connection once and refresh the layer. There is no export step on this path, no file to send, and nothing to keep in sync — a committed observation is in the layer the next time QGIS reads it."
			/>

			<div className="px-gutter pb-page">
				<div className="grid grid-cols-1 gap-wide lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					<section className="min-w-0 max-w-[60ch]">
						<div className="flex items-baseline justify-between gap-snug">
							<h2 className="text-heading text-text">Connection</h2>
							<Chip tone="attention" glyph="◼">
								Illustrative values
							</Chip>
						</div>

						<div className="mt-base" style={{ "--rule-fade": "16px" } as React.CSSProperties}>
							<FieldRow label="Host" value={<span translate="no">{QGIS_CONNECTION.host}</span>} />
							<FieldRow label="Port" value={<span className="tnum">{QGIS_CONNECTION.port}</span>} />
							<FieldRow label="Database" value={<span translate="no">{QGIS_CONNECTION.database}</span>} />
							<FieldRow label="Schema" value={<span translate="no">{QGIS_CONNECTION.schema}</span>} />
							<FieldRow label="User" value={<span translate="no">{QGIS_CONNECTION.user}</span>} />
							<FieldRow label="SSL mode" value={QGIS_CONNECTION.sslMode} />
						</div>

						<div className="mt-base">
							<CopyField label="connection string" value={uri} />
						</div>

						<Prose tone="faint" className="mt-base">
							The password is never shown here and never travels in this string. The real host, database
							and reader credentials for this project are held with the hosted setup, not published in the
							application.
						</Prose>
					</section>

					<section className="min-w-0 max-w-[60ch]">
						<h2 className="text-heading text-text">{plural(QGIS_LAYERS.length, "layer")} exposed</h2>
						<Prose tone="faint" className="mt-tight">
							Every layer is read-only for the pilot. Desktop editing would need the sync contract to
							accept QGIS as a writer, and that is not in scope.
						</Prose>
						<div className="mt-base">
							{QGIS_LAYERS.map(layer => (
								<div
									key={layer.name}
									className="flex items-baseline justify-between gap-base border-b border-rule-faint py-snug">
									<div className="min-w-0">
										<p className="truncate text-detail text-neutral-200" translate="no">
											{layer.name}
										</p>
										<p className="text-micro text-neutral-500">{layer.detail}</p>
									</div>
									<Chip tone="muted">{layer.mode}</Chip>
								</div>
							))}
						</div>
					</section>
				</div>

				<FadeRule className="my-wide" />

				<div className="grid max-w-[80ch] grid-cols-1 gap-base">
					<SectionLabel>What has actually been verified</SectionLabel>
					<h2 className="text-heading text-text">Two uploads, read back independently</h2>
					<Prose>
						The collector has signed in natively and uploaded two real observations, saved offline first and
						sent on reconnect. Both were confirmed in hosted PostGIS and opened in QGIS Desktop. The API ran
						on a development computer, and this is not a production deployment.
					</Prose>
					<AttentionNote
						title="The panel above is not reading that database"
						body="This application has not been connected to the API. The host, layer names and layer count on this screen describe the shape of the connection; they are not a live status, and “read-only” is a stated intent rather than a permission this page has checked."
					/>
				</div>
			</div>
		</div>
	);
}
