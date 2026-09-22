"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Icon } from "@/components/shared/Icon";
import { arcGisRequestPreview, downloadText, observationsToCsv, observationsToGeoJson } from "@/lib/fieldExports";
import { useCaptureStore } from "@/state/useCaptureStore";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { ObservationCondition, ObservationDraft, ObservationKind } from "@/types/capture";

const CaptureMap = dynamic(() => import("./CaptureMap"), {
	ssr: false,
	loading: () => <div className="capture-map-loading">Preparing field package…</div>
});

const KIND_OPTIONS: { value: ObservationKind; label: string }[] = [
	{ value: "tree", label: "Tree / natural feature" },
	{ value: "irrigation", label: "Irrigation asset" },
	{ value: "play_area", label: "Use / activity area" },
	{ value: "access", label: "Access point" },
	{ value: "other", label: "Other observation" }
];

const CONDITION_OPTIONS: { value: ObservationCondition; label: string }[] = [
	{ value: "good", label: "Good / present" },
	{ value: "monitor", label: "Monitor" },
	{ value: "needs_action", label: "Needs action" },
	{ value: "not_present", label: "Not present" }
];

function localDateTime(): string {
	const now = new Date();
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

function emptyDraft(initials = "PS"): ObservationDraft {
	return {
		observerInitials: initials,
		observedAt: localDateTime(),
		kind: "tree",
		condition: "good",
		ageOrSize: "",
		notes: "",
		followUpRequired: false,
		captureMethod: "map_tap"
	};
}

export function FieldCaptureWorkspace() {
	const workspaceOpen = useCaptureStore(state => state.workspaceOpen);
	const closeWorkspace = useCaptureStore(state => state.closeWorkspace);
	const isPlacing = useCaptureStore(state => state.isPlacing);
	const startPlacing = useCaptureStore(state => state.startPlacing);
	const draftCoordinates = useCaptureStore(state => state.draftCoordinates);
	const setDraftCoordinates = useCaptureStore(state => state.setDraftCoordinates);
	const cancelDraft = useCaptureStore(state => state.cancelDraft);
	const observations = useCaptureStore(state => state.observations);
	const saveObservation = useCaptureStore(state => state.saveObservation);
	const markAllSynced = useCaptureStore(state => state.markAllSynced);
	const resetDemo = useCaptureStore(state => state.resetDemo);
	const connectivity = useOperationsStore(state => state.connectivity);
	const toggleConnectivity = useOperationsStore(state => state.toggleConnectivity);
	const [draft, setDraft] = useState<ObservationDraft>(() => emptyDraft());
	const [notice, setNotice] = useState("Local field package ready");
	const [arcGisOpen, setArcGisOpen] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const queued = observations.filter(item => item.properties.syncStatus === "queued").length;
	const online = connectivity === "online";
	const requestPreview = useMemo(() => arcGisRequestPreview(observations), [observations]);

	const updateDraft = <Key extends keyof ObservationDraft>(key: Key, value: ObservationDraft[Key]) => {
		setDraft(current => ({ ...current, [key]: value }));
	};

	const placePoint = (coordinates: [number, number], method: ObservationDraft["captureMethod"] = "map_tap") => {
		setDraftCoordinates(coordinates);
		updateDraft("captureMethod", method);
		setNotice(`Point fixed at ${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`);
	};

	const save = () => {
		if (!draftCoordinates) {
			setNotice("Add a point on the map before saving.");
			return;
		}
		if (!draft.observerInitials.trim()) {
			setNotice("Observer initials are required.");
			return;
		}
		const saved = saveObservation(draft);
		if (!saved) return;
		setNotice(`${saved.id} saved locally and queued for sync.`);
		setDraft(current => emptyDraft(current.observerInitials));
	};

	const exportCsv = () => {
		downloadText("fieldmaps-observations-qgis.csv", observationsToCsv(observations), "text/csv;charset=utf-8");
		setNotice("QGIS-ready CSV downloaded with longitude and latitude columns.");
	};

	const exportGeoJson = () => {
		downloadText(
			"fieldmaps-observations.geojson",
			JSON.stringify(observationsToGeoJson(observations), null, 2),
			"application/geo+json"
		);
		setNotice("GeoJSON layer downloaded in EPSG:4326.");
	};

	const sync = () => {
		if (!online) {
			setNotice("No connection: changes remain safely queued on this device.");
			return;
		}
		if (queued === 0) {
			setNotice("Everything is already synced.");
			return;
		}
		setSyncing(true);
		setNotice(`Sending ${queued} edits using the ArcGIS applyEdits shape…`);
		window.setTimeout(() => {
			markAllSynced();
			setSyncing(false);
			setNotice(`${queued} edits synced in the demo.`);
		}, 850);
	};

	return (
		<section
			className={`field-capture ${workspaceOpen ? "is-open" : ""}`}
			aria-label="Offline field collection demo">
			<header className="capture-header">
				<div className="capture-title-block">
					<button
						className="capture-close"
						type="button"
						onClick={closeWorkspace}
						aria-label="Return to operations console">
						<Icon name="x" size={23} />
					</button>
					<div>
						<span className="capture-eyebrow">Northstar field package · prototype</span>
						<h1>Collect field observation</h1>
					</div>
				</div>
				<div className="capture-header-actions">
					<button className="capture-connection" type="button" onClick={toggleConnectivity}>
						<Icon name={online ? "wifi" : "wifi-off"} size={17} />
						{online ? "Online" : "Offline"}
					</button>
					<button
						className="capture-action"
						type="button"
						onClick={exportCsv}
						disabled={observations.length === 0}>
						QGIS CSV
					</button>
					<button
						className="capture-action"
						type="button"
						onClick={exportGeoJson}
						disabled={observations.length === 0}>
						GeoJSON
					</button>
					<button className="capture-action is-arcgis" type="button" onClick={() => setArcGisOpen(true)}>
						ArcGIS payload
					</button>
				</div>
			</header>

			<div className={`capture-status ${online ? "is-online" : "is-offline"}`}>
				<span>
					<Icon name={online ? "check-circle" : "wifi-off"} size={15} /> {notice}
				</span>
				<span>
					{online
						? "Live basemap + local reference layers"
						: "Offline vector package · tap coordinates still work"}
				</span>
			</div>

			<div className="capture-workspace">
				<div className="capture-form-panel">
					<div className="capture-form-heading">
						<div>
							<span className="capture-eyebrow">Point layer · field_observations</span>
							<h2>Observation details</h2>
						</div>
						<span className={`capture-queue-badge ${queued > 0 ? "has-items" : ""}`}>{queued} queued</span>
					</div>

					<div className={`capture-coordinate-card ${draftCoordinates ? "has-point" : ""}`}>
						<div>
							<span className="capture-coordinate-label">Mapped coordinate</span>
							<strong>
								{draftCoordinates
									? `${draftCoordinates[1].toFixed(6)}, ${draftCoordinates[0].toFixed(6)}`
									: "No point selected"}
							</strong>
						</div>
						<button type="button" className="capture-add-point" onClick={startPlacing}>
							<Icon name={isPlacing ? "target" : "plus"} size={19} />
							{isPlacing ? "Tap the map…" : draftCoordinates ? "Move point" : "Add point"}
						</button>
					</div>

					<div className="capture-form-scroll">
						<label className="capture-field">
							<span>
								Observer initials <b>*</b>
							</span>
							<input
								value={draft.observerInitials}
								maxLength={6}
								onChange={event => updateDraft("observerInitials", event.target.value)}
							/>
						</label>
						<label className="capture-field">
							<span>
								Date and time <b>*</b>
							</span>
							<input
								type="datetime-local"
								value={draft.observedAt}
								onChange={event => updateDraft("observedAt", event.target.value)}
							/>
						</label>
						<label className="capture-field">
							<span>
								Feature type <b>*</b>
							</span>
							<select
								value={draft.kind}
								onChange={event => updateDraft("kind", event.target.value as ObservationKind)}>
								{KIND_OPTIONS.map(option => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<label className="capture-field">
							<span>
								Condition <b>*</b>
							</span>
							<select
								value={draft.condition}
								onChange={event =>
									updateDraft("condition", event.target.value as ObservationCondition)
								}>
								{CONDITION_OPTIONS.map(option => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<label className="capture-field">
							<span>Age, grade, or size</span>
							<input
								value={draft.ageOrSize}
								placeholder="Example: Mature / 18–24 ft"
								onChange={event => updateDraft("ageOrSize", event.target.value)}
							/>
						</label>
						<label className="capture-field">
							<span>Field notes</span>
							<textarea
								value={draft.notes}
								placeholder="Record observable conditions…"
								onChange={event => updateDraft("notes", event.target.value)}
							/>
						</label>
						<label className="capture-follow-up">
							<input
								type="checkbox"
								checked={draft.followUpRequired}
								onChange={event => updateDraft("followUpRequired", event.target.checked)}
							/>
							<span>
								<strong>Follow-up required</strong>
								<small>Create a queued maintenance action with this point.</small>
							</span>
						</label>

						<div className="capture-form-actions">
							<button
								type="button"
								className="capture-secondary"
								onClick={() => placePoint([-119.7709, 36.7347], "sample")}>
								Use sample point
							</button>
							{draftCoordinates && (
								<button type="button" className="capture-secondary" onClick={cancelDraft}>
									Clear
								</button>
							)}
							<button type="button" className="capture-save" onClick={save}>
								<Icon name="check" size={18} /> Save offline
							</button>
						</div>

						<div className="capture-saved-list">
							<div className="capture-list-heading">
								<span>Saved on this device</span>
								<button type="button" onClick={resetDemo}>
									Reset demo
								</button>
							</div>
							{observations
								.slice()
								.reverse()
								.slice(0, 4)
								.map(observation => (
									<div className="capture-saved-row" key={observation.id}>
										<span className={`capture-saved-dot is-${observation.properties.syncStatus}`} />
										<div>
											<strong>
												{observation.id} · {observation.properties.kind.replaceAll("_", " ")}
											</strong>
											<small>
												{observation.geometry.coordinates[1].toFixed(5)},{" "}
												{observation.geometry.coordinates[0].toFixed(5)}
											</small>
										</div>
										<span>{observation.properties.syncStatus}</span>
									</div>
								))}
						</div>
					</div>
				</div>

				<div className="capture-map-panel">
					<CaptureMap
						online={online}
						active={workspaceOpen}
						isPlacing={isPlacing}
						draftCoordinates={draftCoordinates}
						observations={observations}
						onPoint={coordinates => placePoint(coordinates, "map_tap")}
					/>
					<div className="capture-map-topline">
						<span>
							<Icon name="layers" size={15} /> Parcel reference · Observation points
						</span>
						<span>EPSG:4326</span>
					</div>
					<div className="capture-map-cta">
						<button type="button" onClick={startPlacing} className={isPlacing ? "is-active" : ""}>
							<Icon name="target" size={22} />
							<span>
								<strong>{isPlacing ? "Tap anywhere to place" : "Add a mapped point"}</strong>
								<small>No GPS required</small>
							</span>
						</button>
					</div>
					<div className="capture-map-legend">
						<span>
							<i className="legend-parcel" /> Reference polygon
						</span>
						<span>
							<i className="legend-queued" /> Queued point
						</span>
						<span>
							<i className="legend-synced" /> Synced point
						</span>
					</div>
				</div>
			</div>

			<footer className="capture-footer">
				<div>
					<strong>{observations.length}</strong> observations stored locally · <strong>{queued}</strong>{" "}
					waiting to upload
				</div>
				<button type="button" onClick={sync} disabled={syncing || queued === 0}>
					<Icon name="sync" size={18} className={syncing ? "fo-pulse" : ""} />
					{!online
						? "Connect to sync"
						: syncing
							? "Syncing…"
							: queued === 0
								? "All synced"
								: `Sync ${queued} changes`}
				</button>
			</footer>

			{arcGisOpen && (
				<div className="capture-modal-backdrop" role="presentation" onMouseDown={() => setArcGisOpen(false)}>
					<div
						className="capture-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="arcgis-preview-title"
						onMouseDown={event => event.stopPropagation()}>
						<div className="capture-modal-heading">
							<div>
								<span className="capture-eyebrow">Integration proof</span>
								<h2 id="arcgis-preview-title">ArcGIS Feature Service payload</h2>
							</div>
							<button type="button" onClick={() => setArcGisOpen(false)} aria-label="Close">
								<Icon name="x" size={20} />
							</button>
						</div>
						<p>
							This is the request shape the queued points can send to a writable{" "}
							<code>FeatureServer/0/applyEdits</code> endpoint after authentication is configured.
						</p>
						<div className="capture-bridge-grid">
							<div>
								<span>Method</span>
								<strong>POST</strong>
							</div>
							<div>
								<span>Add features</span>
								<strong>{observations.length}</strong>
							</div>
							<div>
								<span>Spatial reference</span>
								<strong>WKID 4326</strong>
							</div>
						</div>
						<pre>{JSON.stringify(requestPreview, null, 2)}</pre>
						<div className="capture-modal-actions">
							<button type="button" className="capture-secondary" onClick={() => setArcGisOpen(false)}>
								Close
							</button>
							<button
								type="button"
								className="capture-save"
								onClick={() =>
									downloadText(
										"arcgis-apply-edits-preview.json",
										JSON.stringify(requestPreview, null, 2),
										"application/json"
									)
								}>
								Download request JSON
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
