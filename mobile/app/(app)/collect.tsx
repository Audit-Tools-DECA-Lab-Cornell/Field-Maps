import { Redirect } from "expo-router";

/** Until the Contour collect screen lands (Phase 7), collecting continues on the existing field screen. */
export default function Collect() {
  return <Redirect href="/field" />;
}
