"use client";

import { Segmented } from "@/components/contour";
import { type ThemeName, THEMES } from "@/lib/contour";
import { useTheme } from "@/lib/theme";

const LABEL: Record<ThemeName, string> = { day: "Day", dusk: "Dusk" };

/** Switches the whole gallery between Day and Dusk, and remembers the choice like the account menu does. */
export function ThemeSwitch() {
	const [theme, setTheme] = useTheme();
	return (
		<Segmented
			label="Screen theme"
			value={theme}
			onValueChange={value => setTheme(value as ThemeName)}
			options={THEMES.map(name => ({ value: name, label: LABEL[name], icon: name === "dusk" ? "moon" : "sun" }))}
		/>
	);
}
