import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";
import { VIEWER } from "@/fixtures";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
	return <StubPage title="Account" lead={`${VIEWER.name} · ${VIEWER.email}`} screen="Account" />;
}
