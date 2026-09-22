import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { PwaRegister } from "@/components/app-shell/PwaRegister";

/**
 * Inter is the Nocturne face. It is self-hosted by next/font rather than fetched from Google,
 * for the same reason the collector bundles it: chrome never waits on a network.
 */
const inter = Inter({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	display: "swap",
	variable: "--font-inter"
});

export const metadata: Metadata = {
	title: {
		default: "FieldMaps",
		template: "%s · FieldMaps"
	},
	description:
		"The management side of FieldMaps: projects, places, instruments and the observations the field collector writes to the shared spatial database.",
	manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
	themeColor: "#161826",
	colorScheme: "dark"
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={inter.variable}>
			<head>
				<meta name="google-site-verification" content="kxlspCXgDMZBx65C7afIxXCO0kRB1aHuoBf02jy_rQ4" />
			</head>
			<body>
				{children}
				<PwaRegister />
			</body>
		</html>
	);
}
