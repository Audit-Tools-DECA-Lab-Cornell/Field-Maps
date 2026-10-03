import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geologica, Spline_Sans_Mono } from "next/font/google";

import { PwaRegister } from "@/components/app-shell/PwaRegister";
import { CONTOUR } from "@/lib/contour";
import { THEME_SCRIPT } from "@/lib/theme-script";

/**
 * Geologica carries every word; Spline Sans Mono carries what someone might read aloud (IDs, versions,
 * codes, counts). Both are self-hosted by next/font, so the chrome never waits on a network.
 */
const geologica = Geologica({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-geologica"
});

const splineMono = Spline_Sans_Mono({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-spline-mono"
});

export const metadata: Metadata = {
	title: {
		default: "FieldMaps",
		template: "%s · FieldMaps"
	},
	description:
		"FieldMaps keeps every field observation with its place: an offline collector for observers and a workspace for the research team.",
	manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
	themeColor: CONTOUR.themes.day.ground,
	colorScheme: "light dark"
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			data-theme="day"
			className={`${geologica.variable} ${splineMono.variable}`}
			suppressHydrationWarning>
			<head>
				<meta name="google-site-verification" content="kxlspCXgDMZBx65C7afIxXCO0kRB1aHuoBf02jy_rQ4" />
				<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
			</head>
			<body>
				{children}
				<PwaRegister />
			</body>
		</html>
	);
}
