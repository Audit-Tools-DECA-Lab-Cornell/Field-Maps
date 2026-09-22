import "leaflet/dist/leaflet.css";
import "./globals.css";

import type { Metadata } from "next";

import { PwaRegister } from "@/components/app-shell/PwaRegister";

export const metadata: Metadata = {
	title: "FieldMaps Offline Collector — Northstar Ag Operations",
	description: "Offline field data collection prototype with QGIS exports and ArcGIS Feature Service handoff.",
	manifest: "/manifest.webmanifest"
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full" data-theme="petrol">
			<body className="min-h-full">
				{children}
				<PwaRegister />
			</body>
		</html>
	);
}
