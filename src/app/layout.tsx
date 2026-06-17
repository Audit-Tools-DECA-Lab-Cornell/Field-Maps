import "leaflet/dist/leaflet.css";
import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "FieldOps Parcel Editor — Northstar Ag Operations",
	description: "Internal GIS operations prototype for farm parcel inspection, editing, and sync workflows."
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full" data-theme="petrol">
			<body className="min-h-full">{children}</body>
		</html>
	);
}
