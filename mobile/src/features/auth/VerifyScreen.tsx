import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { type TextInput as NativeTextInput, StyleSheet, View } from "react-native";
import {
  announce,
  Button,
  CodeInput,
  Field,
  Mono,
  Note,
  Text,
  TextLink,
  type Theme,
  useHaptics,
  useStyles,
} from "../../ui";
import { PREVIEW_ACCOUNT, useDataSource } from "../preview";
import { useGate } from "./gate";
import { AuthScreen, Footnote, firstParam, PreviewLine } from "./parts";
import { AUTH_WIRED, CODE_LENGTH, formatCountdown, RESEND_SECONDS, WRONG_CODE_DEMO } from "./rules";
import { useCooldown } from "./use-cooldown";

function verifyStyles(t: Theme) {
  return StyleSheet.create({
    more: { gap: t.space.s2 },
    resend: { marginTop: t.space.s2, gap: t.space.s2 },
    centre: { alignSelf: "center" },
  });
}

/** What a release build says at the sixth digit while account creation is not wired. */
const NO_ACCOUNT = {
  title: "No account was created.",
  body: "This build does not create accounts yet. Ask your project coordinator for an account, then sign in.",
} as const;

/** Selects the whole code once the field has settled, so the next digits typed replace it. */
function reselect(input: NativeTextInput | null) {
  requestAnimationFrame(() => {
    input?.focus();
    input?.setSelection(0, CODE_LENGTH);
  });
}

/**
 * Check your email (Mobile 26). The code checks itself at the sixth digit, typed, pasted or filled from
 * the keyboard's suggestion. While these screens run on preview data any six digits continue, and 000000
 * shows the wrong-code message. A new code can be asked for every 30 seconds; the wait counts down in mono.
 */
export function VerifyScreen() {
  const s = useStyles(verifyStyles);
  const router = useRouter();
  const haptics = useHaptics();
  const { mode } = useDataSource();
  const gate = useGate();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email =
    firstParam(params.email) || (mode === "preview" ? PREVIEW_ACCOUNT.email : undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const inputRef = useRef<NativeTextInput>(null);
  // A code was sent on the way here, so the first resend waits too.
  const cooldown = useCooldown(RESEND_SECONDS, true);
  const waiting = cooldown.remaining > 0;

  function check(value: string) {
    if (busy) return;
    if (value.length < CODE_LENGTH) {
      setError("Enter all six digits from the email.");
      inputRef.current?.focus();
      return;
    }
    if (value === WRONG_CODE_DEMO) {
      haptics.warning();
      setError("That code did not match. Check the latest email and try again.");
      reselect(inputRef.current);
      return;
    }
    setError(undefined);
    // MOB-05 checks the code with verifyOtp here: it signs the new account in, and the gate then opens
    // onboarding by itself. Until then no account exists, so a review build walks on as a new account
    // would, through the gate's onboarding override, and a release build says nothing was made.
    if (gate.overrideAllowed) {
      setBusy(true);
      haptics.success();
      announce("Preview · No account was created. Onboarding opens as it would for a new account.");
      gate.setDevOverride("onboarding");
      return;
    }
    setNoAccount(true);
    announce(NO_ACCOUNT.title);
  }

  function resend() {
    if (waiting) return;
    cooldown.start();
    setCode("");
    setError(undefined);
    inputRef.current?.focus();
    const to = email ?? "your email address";
    announce(
      AUTH_WIRED.verify
        ? `A new code is on its way to ${to}. It replaces the old one.`
        : `Preview · No email was sent. A new code would go to ${to}.`,
    );
  }

  const countdown = formatCountdown(cooldown.remaining);

  return (
    <AuthScreen
      title="Check your email"
      lead={
        email ? (
          <>
            We sent a six-digit code to{" "}
            <Text variant="bodyStrong" tone="ink">
              {email}
            </Text>
            .
          </>
        ) : (
          "We sent a six-digit code to your email address."
        )
      }
      testID="auth-verify"
      action={
        <Button
          label="Verify email"
          busyLabel="Verifying email…"
          busy={busy}
          icon="check"
          fullWidth
          onPress={() => check(code)}
          testID="auth-verify-submit"
        />
      }
      after={
        <View style={s.more}>
          <View style={s.resend}>
            <Button
              label="Resend code"
              variant="outline"
              icon="rotate-cw"
              fullWidth
              disabled={waiting}
              accessibilityHint={
                waiting
                  ? `A new code can be sent every 30 seconds. ${cooldown.remaining} seconds left.`
                  : undefined
              }
              onPress={resend}
              testID="auth-verify-resend"
            />
            {waiting ? (
              // The disabled reason, with the wait in mono. The button's hint carries it for screen readers.
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text variant="body" tone="ink2" align="center">
                  Resend in{" "}
                  <Mono size="body" tone="ink2">
                    {countdown}
                  </Mono>
                </Text>
              </View>
            ) : null}
          </View>
          <TextLink
            label="Change email address"
            onPress={() =>
              router.dismissTo({ pathname: "/create-account", params: { email: email ?? "" } })
            }
            style={s.centre}
          />
        </View>
      }
      bottom={
        <>
          <Footnote>
            Nothing arriving? Check the spam folder, then resend. A new code replaces the old one.
          </Footnote>
          {AUTH_WIRED.verify ? null : (
            <PreviewLine>No email was sent. 000000 shows the wrong-code message.</PreviewLine>
          )}
        </>
      }
    >
      {noAccount ? <Note title={NO_ACCOUNT.title}>{NO_ACCOUNT.body}</Note> : null}
      <Field label="Verification code" hint="Paste all six digits." error={error}>
        <CodeInput
          ref={inputRef}
          kind="otp"
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setError(undefined);
          }}
          onComplete={check}
          autoFocus
          testID="auth-verify-code"
        />
      </Field>
    </AuthScreen>
  );
}
