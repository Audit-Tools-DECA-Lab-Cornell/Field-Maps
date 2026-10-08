import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { type TextInput as NativeTextInput, StyleSheet, View } from "react-native";
import { useMe } from "../../../../src/data/api/me-provider";
import { ScopeList } from "../../../../src/features/onboarding/components";
import {
  formatExpiry,
  type Invitation,
  invitationTarget,
  isCodeProblem,
  JOIN_CODE_LENGTH,
  type JoinFailure,
  joinCodeOf,
  roleLabel,
  roleScope,
  scopeTitle,
} from "../../../../src/features/onboarding/invitation";
import {
  forgetInvitation,
  useForgetInvitationOnLeave,
} from "../../../../src/features/onboarding/pending-invitation-store";
import { useInvitations } from "../../../../src/features/onboarding/use-invitations";
import { useDataSource } from "../../../../src/features/preview";
import { PageIntro, PreviewData } from "../../../../src/features/projects/parts";
import {
  announce,
  Button,
  CodeInput,
  type Fact,
  FactsList,
  Field,
  Island,
  Note,
  Screen,
  ScreenHeader,
  type Theme,
  useHaptics,
  useStyles,
} from "../../../../src/ui";

function joinStyles(t: Theme) {
  return StyleSheet.create({
    body: { gap: t.space.s6 },
    form: { gap: t.space.s5 },
    actions: { gap: t.space.s3 },
  });
}

/**
 * "+ Join" on Projects, for an account that is already set up: the join code, then the invitation to
 * confirm (the same words as onboarding's Mobile 30 and 31). An invitation link opened while signed in
 * arrives here with its code filled in and looked up at once. Nothing is joined until "Join project".
 *
 * On device data the code is looked up with `POST /v1/invitations/preview` and accepted with
 * `POST /v1/invitations/redeem`; then `/v1/me` is read again and the joined project becomes active.
 * Preview data resolves only DECA2026 and joins nothing.
 */
export default function JoinProjectScreen() {
  const s = useStyles(joinStyles);
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => joinCodeOf(params.code));
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<JoinFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const codeRef = useRef<NativeTextInput>(null);
  const invitations = useInvitations();
  const me = useMe();
  const { mode } = useDataSource();
  const haptics = useHaptics();
  const complete = code.length === JOIN_CODE_LENGTH;

  // A waiting invitation is used up once it has been shown and this screen is left.
  useForgetInvitationOnLeave(invitation?.code ?? "", invitation !== null);

  async function preview(raw: string = code) {
    if (busy) return;
    if (raw.length !== JOIN_CODE_LENGTH) {
      setProblem("Enter all eight characters");
      codeRef.current?.focus();
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await invitations.lookup(raw);
      if (result.status === "found") {
        setInvitation(result.invitation);
        return;
      }
      if (result.status === "incomplete") {
        setProblem("Enter all eight characters");
        return;
      }
      // A deleted account: the gate opens welcome in place of the app.
      if (result.failure.kind === "deleted") return;
      haptics.warning();
      announce(result.failure.message);
      if (isCodeProblem(result.failure)) setProblem(result.failure.message);
      else setNotice(result.failure);
    } finally {
      setBusy(false);
    }
  }

  // A link's code is looked up as the screen opens; nothing is joined.
  const looked = useRef(false);
  useEffect(() => {
    if (looked.current) return;
    looked.current = true;
    const linked = joinCodeOf(params.code);
    if (linked.length === JOIN_CODE_LENGTH) void preview(linked);
  });

  async function join() {
    if (!invitation || busy) return;
    setBusy(true);
    setNotice(null);
    const target = invitationTarget(invitation);
    const result = await invitations.redeem(invitation.code);
    if (!result.ok) {
      setBusy(false);
      if (result.failure.kind === "deleted") return;
      haptics.warning();
      setNotice(result.failure);
      announce(result.failure.message);
      return;
    }
    // The membership exists on the server: read it back and make the joined project active.
    if (mode === "device") {
      await me.refresh();
      if (result.projectId) me.selectProject(result.projectId);
    }
    forgetInvitation(invitation.code);
    setBusy(false);
    haptics.success();
    announce(mode === "preview" ? "Preview data: nothing was joined." : `You joined ${target}.`);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function differentCode() {
    if (invitation) forgetInvitation(invitation.code);
    setInvitation(null);
    setNotice(null);
    codeRef.current?.focus();
  }

  const header = <ScreenHeader back showOnline />;

  if (invitation) {
    const target = invitationTarget(invitation);
    const facts: Fact[] = [
      { label: "Organization", value: invitation.organization },
      ...(invitation.project ? [{ label: "Project", value: invitation.project }] : []),
      { label: "Your role", value: roleLabel(invitation.role) },
      { label: "Code expires", value: formatExpiry(invitation.expiresAt) },
      ...(invitation.invitedBy ? [{ label: "Invited by", value: invitation.invitedBy }] : []),
      ...(invitation.sites ? [{ label: "Sites", value: invitation.sites }] : []),
    ];
    return (
      <Screen scroll dock testID="join-project-confirm">
        {header}
        <View style={s.body}>
          <View>
            <PageIntro
              eyebrow={`Invitation · Code ${invitation.code}`}
              title={`Join ${target}?`}
              lead={
                invitation.project
                  ? "Check the project and role before accepting this invitation."
                  : "Check the organization and role before accepting this invitation."
              }
            />
            <PreviewData>Sample invitation. Joining it sends nothing.</PreviewData>
          </View>
          <Island>
            <FactsList items={facts} />
          </Island>
          <ScopeList title={scopeTitle(invitation.role)} items={roleScope(invitation.role)} />
          <View style={s.actions}>
            {notice ? (
              <Note
                tone={isCodeProblem(notice) ? "attention" : "waiting"}
                icon={notice.kind === "offline" ? "wifi-off" : undefined}
                title="Nothing was joined."
              >
                {notice.message}
              </Note>
            ) : null}
            <Button
              label={invitation.project ? "Join project" : "Join organization"}
              icon="check"
              fullWidth
              busy={busy}
              busyLabel="Joining…"
              onPress={() => void join()}
              testID="join-project-join"
            />
            <Button
              variant="outline"
              label="Use a different code"
              fullWidth
              onPress={differentCode}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard dock testID="join-project">
      {header}
      <View style={s.body}>
        <View>
          <PageIntro
            title="Join a project"
            lead="Enter the eight-character code supplied by your coordinator. You will see the project before joining."
          />
          <PreviewData>The sample code DECA2026 opens the Play Study invitation.</PreviewData>
        </View>
        <View style={s.form}>
          <Field label="Project join code" hint="Letters and numbers, no spaces." error={problem}>
            <CodeInput
              ref={codeRef}
              kind="join"
              value={code}
              onChangeText={(next) => {
                setCode(next);
                setProblem(undefined);
                setNotice(null);
              }}
              returnKeyType="go"
              onSubmitEditing={() => void preview()}
              testID="join-project-code"
            />
          </Field>
          {notice ? (
            <Note tone="waiting" icon={notice.kind === "offline" ? "wifi-off" : "clock"}>
              {notice.message}
            </Note>
          ) : null}
          <Button
            label="Preview project"
            iconRight={busy ? undefined : "arrow-right"}
            fullWidth
            busy={busy}
            busyLabel="Looking up the code…"
            disabled={!complete}
            disabledReason="The button turns on when all eight characters are in."
            onPress={() => void preview()}
            testID="join-project-preview"
          />
        </View>
      </View>
    </Screen>
  );
}
