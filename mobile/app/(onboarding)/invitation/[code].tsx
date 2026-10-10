import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMe } from "../../../src/data/api/me-provider";
import { useProfile } from "../../../src/features/auth/profile-store";
import { ScopeList, StepIntro } from "../../../src/features/onboarding/components";
import { useFinishOnboarding } from "../../../src/features/onboarding/finish";
import {
  formatExpiry,
  type InvitationLookup,
  type InvitationRole,
  invitationTarget,
  isCodeProblem,
  type JoinFailure,
  joinCodeOf,
  roleLabel,
  roleScope,
  SHORT_CODE,
  scopeTitle,
  splitMessage,
} from "../../../src/features/onboarding/invitation";
import { useForgetInvitationOnLeave } from "../../../src/features/onboarding/pending-invitation-store";
import {
  useInvitationLookup,
  useInvitations,
} from "../../../src/features/onboarding/use-invitations";
import {
  announce,
  Button,
  type Fact,
  FactsList,
  Icon,
  Island,
  Logo,
  Note,
  Screen,
  ScreenHeader,
  ScreenState,
  Text,
  type Theme,
  useHaptics,
  useStyles,
  useTheme,
} from "../../../src/ui";

/** Back to the code, kept in the field: the join step already in the stack, or a fresh one after a link. */
function toDifferentCode(code: string) {
  router.dismissTo({ pathname: "/join", params: { code } });
}

/**
 * The invitation to confirm (mobile-31): what joining means before anything is joined. A link from
 * someone else can open this screen, but only "Join project" accepts it.
 *
 * On device data the invitation is what `POST /v1/invitations/preview` returned (asked for here when a
 * link opens the screen directly), and "Join project" sends `POST /v1/invitations/redeem`, reads
 * `/v1/me` again, makes the joined project active and finishes onboarding. Preview data shows the
 * Play Study fixture and joins nothing.
 *
 * A link that arrived before sign-in waits on this device (pending-invitation-store) and the profile
 * step brings the observer here; once shown, it is forgotten as the screen is left.
 */
export default function InvitationScreen() {
  const s = useStyles(makeStyles);
  const params = useLocalSearchParams<{ code: string }>();
  const code = joinCodeOf(params.code);
  const profile = useProfile();
  const me = useMe();
  const finish = useFinishOnboarding();
  const haptics = useHaptics();
  const invitations = useInvitations();
  const { lookup, retry } = useInvitationLookup(code);
  const [joining, setJoining] = useState(false);
  const [failure, setFailure] = useState<JoinFailure | null>(null);
  // A code that waited on this device (a link opened before sign-in) is used up once this screen has
  // shown what it opens and is left: joined, gone back from, or swapped for a different code.
  useForgetInvitationOnLeave(code, profile.saved && lookup.status !== "loading");

  // The identity comes first: an invitation opened before it is saved goes back to step 1.
  if (!profile.saved) return <Redirect href={{ pathname: "/profile", params: { code } }} />;

  const header = (
    <ScreenHeader
      back={() => (router.canGoBack() ? router.back() : router.replace("/join"))}
      trailing={<Logo />}
      style={s.header}
    />
  );

  if (lookup.status === "loading")
    return (
      <Screen scroll testID="onboarding-invitation-loading">
        {header}
        <ScreenState
          kind="loading"
          title="Looking up the code"
          body={`Asking DECA Mark what ${code} opens. Nothing is joined yet.`}
        />
      </Screen>
    );

  if (lookup.status !== "found")
    return (
      <Screen scroll testID="onboarding-invitation-missing">
        {header}
        <NotFound lookup={lookup} code={code} onRetry={retry} />
      </Screen>
    );

  const { invitation } = lookup;
  const target = invitationTarget(invitation);

  async function join() {
    if (joining) return;
    setJoining(true);
    setFailure(null);
    const result = await invitations.redeem(code);
    if (!result.ok) {
      setJoining(false);
      // A deleted account: the gate opens welcome in place of onboarding.
      if (result.failure.kind === "deleted") return;
      haptics.warning();
      setFailure(result.failure);
      announce(result.failure.message);
      return;
    }
    // The membership now exists on the server: read it back, then make the joined project active.
    // Offline after the join, the next /v1/me read picks it up instead.
    await me.refresh();
    if (result.projectId) me.selectProject(result.projectId);
    // The gate changes as the profile finishes, and the app opens in place of onboarding.
    if (!finish({ joined: target })) {
      setJoining(false);
      router.replace({ pathname: "/profile", params: { code } });
    }
  }

  const facts: Fact[] = [
    { label: "Organization", value: invitation.organization },
    ...(invitation.project
      ? [{ label: "Project", value: <Text variant="bodyStrong">{invitation.project}</Text> }]
      : []),
    { label: "Your role", value: <RoleValue role={invitation.role} /> },
    { label: "Code expires", value: formatExpiry(invitation.expiresAt) },
    ...(invitation.invitedBy ? [{ label: "Invited by", value: invitation.invitedBy }] : []),
    ...(invitation.sites ? [{ label: "Sites", value: invitation.sites }] : []),
  ];

  // The actions follow what joining means (mobile-31), at the foot of a tall screen; a short one
  // scrolls through the role's scope to reach them, so nothing is accepted unread.
  return (
    <Screen scroll testID="onboarding-invitation">
      {header}
      <View style={s.body}>
        <StepIntro
          eyebrow={`Invitation · Code ${invitation.code}`}
          title={`Join ${target}?`}
          lead={
            invitation.project
              ? "Check the project and role before accepting this invitation."
              : "Check the organization and role before accepting this invitation."
          }
        />
        <Island>
          <FactsList items={facts} />
        </Island>
      </View>
      <View style={s.scope}>
        <ScopeList title={scopeTitle(invitation.role)} items={roleScope(invitation.role)} />
      </View>
      <View style={s.spacer} />
      <View style={s.actions}>
        {failure ? (
          <Note
            tone={isCodeProblem(failure) ? "attention" : "waiting"}
            icon={failure.kind === "offline" ? "wifi-off" : undefined}
            title="Nothing was joined."
            testID="onboarding-join-failure"
          >
            {failure.message}
          </Note>
        ) : null}
        <Button
          label={invitation.project ? "Join project" : "Join organization"}
          icon="check"
          fullWidth
          busy={joining}
          busyLabel="Joining…"
          onPress={() => void join()}
          testID="onboarding-join-project"
        />
        <Button
          variant="outline"
          label="Use a different code"
          fullWidth
          onPress={() => toDifferentCode(code)}
          testID="onboarding-different-code"
        />
      </View>
    </Screen>
  );
}

function RoleValue({ role }: { role: InvitationRole }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.role}>
      <Icon name="user" size={20} color={t.c.ink} />
      <Text variant="bodyStrong">{roleLabel(role)}</Text>
    </View>
  );
}

/**
 * A code that opens no invitation: say what happened, that nothing was joined and the profile is safe,
 * and the way on. A connection problem offers another try; a problem with the code, another code.
 */
function NotFound({
  lookup,
  code,
  onRetry,
}: {
  lookup: Exclude<InvitationLookup, { status: "found" }>;
  code: string;
  onRetry: () => void;
}) {
  const s = useStyles(makeStyles);
  const failure: JoinFailure =
    lookup.status === "failed" ? lookup.failure : { kind: "invalid", message: SHORT_CODE };
  const aboutCode = isCodeProblem(failure);
  // The first sentence is the title, as designed: "We could not find a project for that code".
  const { title, rest } = splitMessage(failure.message);
  return (
    <ScreenState
      kind="empty"
      icon={failure.kind === "offline" ? "wifi-off" : aboutCode ? "search" : "clock"}
      title={title}
      body={`${rest ? `${rest} ` : ""}Nothing was joined, and your profile is saved on this device.`}
      action={
        <View style={s.notFoundActions}>
          {aboutCode ? null : (
            <Button variant="ink" icon="rotate-cw" label="Try again" onPress={onRetry} />
          )}
          <Button
            variant="outline"
            icon="arrow-left"
            label="Use a different code"
            onPress={() => toDifferentCode(code)}
          />
        </View>
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
    notFoundActions: { gap: t.space.s3, alignSelf: "stretch" },
  });
}
