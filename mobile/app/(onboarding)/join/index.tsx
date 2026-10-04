import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Keyboard, type TextInput as NativeTextInput, StyleSheet, View } from "react-native";
import { useProfile } from "../../../src/features/auth/profile-store";
import { OrDivider, StepFoot, StepIntro } from "../../../src/features/onboarding/components";
import { useFinishOnboarding } from "../../../src/features/onboarding/finish";
import {
  JOIN_CODE_LENGTH,
  joinCodeOf,
  lookupInvitation,
  NEEDS_SERVER_REASON,
  UNKNOWN_CODE,
} from "../../../src/features/onboarding/invitation";
import { useKeyboardVisible } from "../../../src/features/onboarding/use-keyboard-visible";
import { useDataSource } from "../../../src/features/preview/data-source";
import {
  Button,
  CodeInput,
  Field,
  Screen,
  ScreenHeader,
  StepBars,
  Text,
  TextLink,
  type Theme,
  useStyles,
} from "../../../src/ui";

/**
 * Onboarding step 2 of 2 (mobile-30): enter the eight-character join code, see the project before
 * joining, or skip and practise in Training. `fieldmaps://join?code=…` opens this step filled in.
 *
 * While the keyboard is up, "Preview project" moves into the pinned footer above it, so typing the code
 * never hides the step's one action; the way out returns when the keyboard goes.
 */
export default function JoinStep() {
  const s = useStyles(makeStyles);
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => joinCodeOf(params.code));
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<NativeTextInput>(null);
  const { mode } = useDataSource();
  const profile = useProfile();
  const finish = useFinishOnboarding();
  const keyboard = useKeyboardVisible();

  // The identity comes first: a link that lands here before it is saved goes back to step 1.
  if (!profile.saved)
    return <Redirect href={{ pathname: "/profile", params: code ? { code } : {} }} />;

  const canLookUp = mode === "preview";
  const complete = code.length === JOIN_CODE_LENGTH;

  function changeCode(next: string) {
    setCode(next);
    setProblem(undefined);
  }

  async function preview() {
    if (busy) return;
    if (!canLookUp) {
      // The reason sits under the button; put it in view.
      Keyboard.dismiss();
      return;
    }
    if (!complete) {
      setProblem("Enter all eight characters");
      codeRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await lookupInvitation(code, mode);
      if (result.status === "found") {
        router.push({ pathname: "/invitation/[code]", params: { code } });
        return;
      }
      setProblem(UNKNOWN_CODE);
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function explainScan() {
    Alert.alert(
      "The camera is not connected in this build",
      "FieldMaps opens the camera only after you tap Scan, and this build cannot scan yet. Type the eight-character code from the invitation instead. An invitation link from your coordinator opens this step by itself.",
      [{ text: "Type the code", onPress: () => codeRef.current?.focus() }],
    );
  }

  function skip() {
    if (!finish()) router.replace("/profile");
  }

  const previewButton = (
    <Button
      label="Preview project"
      iconRight="arrow-right"
      fullWidth
      busy={busy}
      busyLabel="Looking up the code…"
      disabled={!canLookUp || !complete}
      disabledReason={
        canLookUp ? "The button turns on when all eight characters are in." : NEEDS_SERVER_REASON
      }
      onPress={preview}
      testID="onboarding-preview-project"
    />
  );

  return (
    <Screen
      scroll
      keyboard
      testID="onboarding-join"
      footer={
        keyboard ? (
          previewButton
        ) : (
          <StepFoot
            text="No code yet? Training works without a project."
            action={<TextLink label="Skip for now" onPress={skip} testID="onboarding-skip" />}
          />
        )
      }
    >
      <ScreenHeader
        back={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
        trailing={<StepBars count={2} current={2} />}
        style={s.header}
      />
      <View style={s.body}>
        <StepIntro
          title="Join a project"
          lead="Enter the eight-character code supplied by your coordinator. You will see the project before joining."
        />
        <View style={s.join}>
          <Field label="Project join code" hint="Letters and numbers, no spaces." error={problem}>
            <CodeInput
              ref={codeRef}
              kind="join"
              value={code}
              onChangeText={changeCode}
              returnKeyType="go"
              onSubmitEditing={preview}
              testID="onboarding-join-code"
            />
          </Field>
          {keyboard ? null : previewButton}
        </View>
        <View style={s.scan}>
          <OrDivider />
          <View style={s.scanAction}>
            <Button
              variant="outline"
              label="Scan a QR invitation"
              icon="qr-code"
              fullWidth
              onPress={explainScan}
              accessibilityHint="Explains that scanning is not connected in this build."
              testID="onboarding-scan"
            />
            <Text variant="small" tone="ink2" align="center">
              Opens the camera only after you tap. An invitation link from your coordinator opens
              this step by itself.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    // The title sits where the auth screens put theirs (mobile-24 to 30): 24 under the header.
    header: { marginBottom: t.space.s6 },
    body: { gap: t.space.s6 },
    join: { gap: t.space.s5 },
    scan: { gap: t.space.s5 },
    scanAction: { gap: t.space.s3 },
  });
}
