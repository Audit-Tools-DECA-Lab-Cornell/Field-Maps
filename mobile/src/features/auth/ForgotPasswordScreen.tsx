import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { type TextInput as NativeTextInput, StyleSheet } from "react-native";
import { Button, Field, Note, TextInput, TextLink, type Theme, useStyles } from "../../ui";
import { AuthScreen, EMAIL_INPUT, firstParam, PreviewLine } from "./parts";
import { AUTH_WIRED, isEmail, stayingTitle } from "./rules";
import { useWaitingRecords } from "./use-waiting-records";

function forgotStyles(_t: Theme) {
  return StyleSheet.create({
    centre: { alignSelf: "center" },
  });
}

/**
 * Reset your password (Mobile 27). The same thing happens whether or not the address has an account,
 * so the screen cannot be used to look one up. Records waiting on this device are named at the foot:
 * recovering the account neither uploads nor removes them. Recovery is not wired yet (MOB-05), so the
 * button goes on to the recovery code screen without sending anything, and the screen says so.
 */
export function ForgotPasswordScreen() {
  const s = useStyles(forgotStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const waiting = useWaitingRecords();
  const [email, setEmail] = useState(() => firstParam(params.email) || waiting?.email || "");
  const emailTouched = useRef(email !== "");
  const [error, setError] = useState<string>();
  const emailRef = useRef<NativeTextInput>(null);

  // The owner of the waiting records is the account most likely being recovered (Mobile 27): fill it in
  // once the queue has been read, unless something has been typed or passed from sign-in.
  const owner = waiting?.email;
  useEffect(() => {
    if (owner && !emailTouched.current) setEmail((current) => current || owner);
  }, [owner]);

  function submit() {
    if (!isEmail(email)) {
      setError("Enter the email address you signed up with.");
      emailRef.current?.focus();
      return;
    }
    router.push({ pathname: "/reset-password", params: { email: email.trim() } });
  }

  return (
    <AuthScreen
      title="Reset your password"
      lead="If an account exists for this email, we will send a recovery code."
      testID="auth-forgot"
      action={
        <Button
          label="Send recovery code"
          icon="mail"
          fullWidth
          onPress={submit}
          testID="auth-forgot-submit"
        />
      }
      after={
        <TextLink
          label="Back to sign in"
          arrow="left"
          onPress={() =>
            router.dismissTo({ pathname: "/sign-in", params: { email: email.trim() } })
          }
          style={s.centre}
        />
      }
      bottom={
        waiting || !AUTH_WIRED.recovery ? (
          <>
            {waiting ? (
              <Note tone="waiting" icon="smartphone" title={stayingTitle(waiting.count)}>
                while you recover your account. Nothing is uploaded or removed until you sign in
                again.
              </Note>
            ) : null}
            {AUTH_WIRED.recovery ? null : (
              <PreviewLine>
                No email is sent from this screen yet. The next screen accepts any six digits.
              </PreviewLine>
            )}
          </>
        ) : undefined
      }
    >
      <Field label="Email address" error={error}>
        <TextInput
          ref={emailRef}
          {...EMAIL_INPUT}
          textContentType="emailAddress"
          value={email}
          onChangeText={(value) => {
            emailTouched.current = true;
            setEmail(value);
            setError(undefined);
          }}
          returnKeyType="go"
          onSubmitEditing={submit}
          testID="auth-forgot-email"
        />
      </Field>
    </AuthScreen>
  );
}
