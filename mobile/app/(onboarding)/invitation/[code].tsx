import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useProfile } from "../../../src/features/auth/profile-store";
import { ScopeList, StepIntro } from "../../../src/features/onboarding/components";
import { useFinishOnboarding } from "../../../src/features/onboarding/finish";
import {
  type InvitationLookup,
  joinCodeOf,
  resolveInvitation,
} from "../../../src/features/onboarding/invitation";
import { useDataSource } from "../../../src/features/preview/data-source";
import {
  Button,
  type Fact,
  FactsList,
  Icon,
  Island,
  Logo,
  Screen,
  ScreenHeader,
  ScreenState,
  Text,
  type Theme,
  useStyles,
  useTheme,
} from "../../../src/ui";

const OBSERVER_SCOPE = [
  { allowed: true, text: "Collect observations on mobile; your account remains your own." },
  { allowed: false, text: "No access to forms, maps, the team or project settings." },
] as const;

/** Back to the code: the join step already in the stack, or a fresh one after a link. */
function toDifferentCode() {
  router.dismissTo("/join");
}

/**
 * The invitation to confirm (mobile-31): what joining means before anything is joined. A link from
 * someone else can open this screen, but only "Join project" accepts it.
 */
export default function InvitationScreen() {
  const s = useStyles(makeStyles);
  const params = useLocalSearchParams<{ code: string }>();
  const code = joinCodeOf(params.code);
  const { mode } = useDataSource();
  const profile = useProfile();
  const finish = useFinishOnboarding();
  const [joining, setJoining] = useState(false);

  // The identity comes first: an invitation opened before it is saved goes back to step 1.
  if (!profile.saved) return <Redirect href={{ pathname: "/profile", params: { code } }} />;

  const lookup = resolveInvitation(code, mode);
  const header = (
    <ScreenHeader
      back={() => (router.canGoBack() ? router.back() : router.replace("/join"))}
      trailing={<Logo />}
      style={s.header}
    />
  );

  if (lookup.status !== "found")
    return (
      <Screen scroll testID="onboarding-invitation-missing">
        {header}
        <NotFound lookup={lookup} />
      </Screen>
    );

  const { invitation } = lookup;

  function join() {
    if (joining) return;
    setJoining(true);
    // The gate changes as the profile finishes, and the app opens in place of onboarding.
    if (!finish({ joined: invitation.project })) {
      setJoining(false);
      router.replace({ pathname: "/profile", params: { code } });
    }
  }

  const facts: Fact[] = [
    { label: "Organization", value: invitation.organization },
    {
      label: "Project",
      value: <Text variant="bodyStrong">{invitation.project}</Text>,
    },
    { label: "Your role", value: <RoleValue role={invitation.role} /> },
    { label: "Invited by", value: invitation.invitedBy },
    { label: "Sites", value: invitation.sites },
  ];

  // The actions follow what joining means (mobile-31), at the foot of a tall screen; a short one
  // scrolls through the role's scope to reach them, so nothing is accepted unread.
  return (
    <Screen scroll testID="onboarding-invitation">
      {header}
      <View style={s.body}>
        <StepIntro
          eyebrow={`Invitation · Code ${invitation.code}`}
          title={`Join ${invitation.project}?`}
          lead="Check the project and role before accepting this invitation."
        />
        <Island>
          <FactsList items={facts} />
        </Island>
      </View>
      <View style={s.scope}>
        <ScopeList title="As an observer" items={OBSERVER_SCOPE} />
      </View>
      <View style={s.spacer} />
      <View style={s.actions}>
        <Button
          label="Join project"
          icon="check"
          fullWidth
          busy={joining}
          busyLabel="Joining…"
          onPress={join}
          testID="onboarding-join-project"
        />
        <Button
          variant="outline"
          label="Use a different code"
          fullWidth
          onPress={toDifferentCode}
          testID="onboarding-different-code"
        />
      </View>
    </Screen>
  );
}

function RoleValue({ role }: { role: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.role}>
      <Icon name="user" size={20} color={t.c.ink} />
      <Text variant="bodyStrong">{role}</Text>
    </View>
  );
}

/** A code that opens no invitation: say what happened, that nothing was joined, and the way back. */
function NotFound({ lookup }: { lookup: Exclude<InvitationLookup, { status: "found" }> }) {
  const needsServer = lookup.status === "needs-server";
  return (
    <ScreenState
      kind="empty"
      icon={needsServer ? "wifi-off" : "search"}
      title={
        needsServer
          ? "This build cannot look up invitations yet"
          : "We could not find a project for that code"
      }
      body={
        needsServer
          ? "Nothing was joined, and your profile is saved on this device. Skip for now to practise in Training; your coordinator can add you once joining is connected."
          : "Check it with your coordinator. Nothing was joined, and your profile is saved on this device."
      }
      action={
        <Button
          variant="outline"
          icon="arrow-left"
          label="Use a different code"
          onPress={toDifferentCode}
        />
      }
    />
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    header: { marginBottom: t.space.s6 },
    body: { gap: t.space.s6 },
    scope: { marginTop: t.space.s4 },
    spacer: { flexGrow: 1, minHeight: t.space.s7 },
    actions: { gap: t.space.s3 },
    role: { flexDirection: "row", alignItems: "center", gap: t.space.s2 },
  });
}
