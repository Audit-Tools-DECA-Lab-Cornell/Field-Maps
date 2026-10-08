import { Redirect, useLocalSearchParams } from "expo-router";
import { useProfile } from "../../../src/features/auth/profile-store";
import { JOIN_CODE_LENGTH, joinCodeOf } from "../../../src/features/onboarding/invitation";

/**
 * The invitation link, `fieldmaps://join/DECA2026` (expo-router maps the app scheme onto routes). It
 * never joins anything by itself: a whole code opens the invitation to confirm, a partial one opens the
 * join step filled in, and an observer without a saved identity sets it first.
 */
export default function JoinLink() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = joinCodeOf(params.code);
  const profile = useProfile();

  if (!profile.saved) return <Redirect href={{ pathname: "/profile", params: { code } }} />;
  if (code.length !== JOIN_CODE_LENGTH)
    return <Redirect href={{ pathname: "/join", params: { code } }} />;
  return <Redirect href={{ pathname: "/invitation/[code]", params: { code } }} />;
}
