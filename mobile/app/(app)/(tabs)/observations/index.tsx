import { Redirect } from "expo-router";

/** Until the Contour observations list lands (Phase 8), the tab opens the existing records screen. */
export default function ObservationsTab() {
  return <Redirect href="/records" />;
}
