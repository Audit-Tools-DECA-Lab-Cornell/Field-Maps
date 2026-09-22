"use client";

import { Button } from "@/components/shared/Button";
import { FieldRow } from "@/components/shared/FieldRow";
import { Icon } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";
import { countRealVertices } from "@/lib/geometry";
import { selectSelectedParcel, useOperationsStore } from "@/state/useOperationsStore";

import { EmptyInspector } from "./EmptyInspector";

const INSTRUCTIONS = [
	"Drag a vertex on the map to reshape the boundary.",
	"Click a hollow midpoint handle to add a vertex.",
	"Select a vertex, then Remove to delete it (min 3).",
	"Save boundary to stage a geometry update."
];

/** A validation message is blocking if it mentions these phrases. */
function isBlocking(message: string): boolean {
	return /at least|cross|intersect/i.test(message);
}

export function GeometryEditPanel() {
	const geometryEdit = useOperationsStore(s => s.geometryEdit);
	const parcel = useOperationsStore(selectSelectedParcel);
	const removeDraftVertex = useOperationsStore(s => s.removeDraftVertex);
	const cancelGeometryEdit = useOperationsStore(s => s.cancelGeometryEdit);
	const saveGeometry = useOperationsStore(s => s.saveGeometry);

	const { draftCoordinates, selectedVertexIndex, areaDeltaAcres, validationMessages } = geometryEdit;

	if (!draftCoordinates) return <EmptyInspector />;

	const vertices = countRealVertices(draftCoordinates);
	const baseAcreage = parcel?.properties.acreage ?? 0;
	const acreage = Math.max(0, baseAcreage + areaDeltaAcres).toFixed(1);
	const deltaPositive = areaDeltaAcres >= 0;
	const deltaText = (deltaPositive ? "+" : "") + areaDeltaAcres.toFixed(2) + " ac";

	return (
		<div>
			<div style={{ padding: "14px 14px 0" }}>
				<div className="fo-kicker">Boundary Edit Mode</div>
				<h2 style={{ margin: "4px 0 10px", fontSize: 16, fontWeight: 700 }}>Edit boundary</h2>
				<ul
					style={{
						margin: 0,
						paddingLeft: 16,
						display: "flex",
						flexDirection: "column",
						gap: 4,
						fontSize: 11.5,
						color: "var(--text-2)"
					}}>
					{INSTRUCTIONS.map((line, i) => (
						<li key={i}>{line}</li>
					))}
				</ul>
			</div>

			<Section title="Geometry">
				<div>
					<FieldRow label="Vertices">{vertices}</FieldRow>
					<FieldRow label="Estimated acreage">{acreage} ac</FieldRow>
					<FieldRow label="Area change">
						<span
							style={{
								color: deltaPositive ? "var(--green-fg)" : "var(--red-fg)",
								fontWeight: 650
							}}>
							{deltaText}
						</span>
					</FieldRow>
				</div>

				{validationMessages.length > 0 && (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 6,
							marginTop: 8
						}}>
						{validationMessages.map((msg, i) => {
							const blocking = isBlocking(msg);
							const color = blocking ? "var(--red-fg)" : "var(--amber-fg)";
							return (
								<div
									key={i}
									style={{
										display: "flex",
										alignItems: "flex-start",
										gap: 8,
										fontSize: 11.5,
										color: "var(--text-2)"
									}}>
									<Icon name="warning" size={14} style={{ color, marginTop: 1 }} />
									<span>{msg}</span>
								</div>
							);
						})}
					</div>
				)}
			</Section>

			{/* footer */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "flex-end",
					gap: 8,
					padding: "12px 14px",
					borderTop: "1px solid var(--border)"
				}}>
				<Button
					variant="subtle"
					disabled={selectedVertexIndex === null}
					onClick={() => {
						if (selectedVertexIndex !== null) removeDraftVertex(selectedVertexIndex);
					}}>
					<Icon name="trash" size={13} />
					Remove vertex
				</Button>
				<Button variant="subtle" onClick={cancelGeometryEdit}>
					Cancel
				</Button>
				<Button variant="primary" onClick={saveGeometry}>
					Save boundary
				</Button>
			</div>
		</div>
	);
}
