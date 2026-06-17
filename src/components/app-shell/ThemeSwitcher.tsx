"use client";

import { THEMES } from "@/lib/themes";
import { useOperationsStore } from "@/state/useOperationsStore";

export function ThemeSwitcher() {
	const theme = useOperationsStore(s => s.theme);
	const setTheme = useOperationsStore(s => s.setTheme);

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 7 }}>
			<span className="fo-kicker">Theme</span>
			<div style={{ display: "flex", gap: 4 }}>
				{THEMES.map(t => {
					const active = t.name === theme;
					return (
						<button
							key={t.name}
							type="button"
							title={`${t.label} — ${t.blurb}`}
							aria-label={`${t.label} theme`}
							aria-pressed={active}
							onClick={() => setTheme(t.name)}
							style={{
								width: 22,
								height: 22,
								padding: 0,
								borderRadius: 99,
								cursor: "pointer",
								background: t.swatchBg,
								border: active ? "2px solid var(--accent)" : "1px solid var(--border-strong)",
								boxShadow: active ? "0 0 0 2px var(--accent-tint)" : "none",
								display: "grid",
								placeItems: "center",
								transition: "transform 0.08s ease"
							}}>
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: 99,
									background: t.swatchAccent
								}}
							/>
						</button>
					);
				})}
			</div>
		</div>
	);
}
