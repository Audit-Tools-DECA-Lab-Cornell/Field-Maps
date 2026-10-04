import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import type { TextInput as NativeTextInput } from "react-native";
import { announce, Button, CodeInput, Field, useHaptics } from "../../ui";
import { leaveAuthNotice } from "./notice";
import { AuthScreen, FieldStack, Footnote, firstParam, PasswordFields, PreviewLine } from "./parts";
import {
  AUTH_WIRED,
  CODE_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_CHANGED,
  resetDisabledReason,
  WRONG_CODE_DEMO,
} from "./rules";

/**
 * Choose a new password (Mobile 28). "Save new password" stays off, with its reason under it, until the
 * code is in and both passwords match. Recovery is not wired yet (MOB-05): any six digits continue, 000000
 * shows the wrong-code message, and sign-in then says plainly that no password was changed.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = firstParam(params.email);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const codeRef = useRef<NativeTextInput>(null);
  const passwordRef = useRef<NativeTextInput>(null);
  const confirmRef = useRef<NativeTextInput>(null);
  const reason = resetDisabledReason(code, password, confirm);

  function submit() {
    if (reason) {
      // From the keyboard's return key: go to what is still missing, and say why nothing happened.
      if (code.length < CODE_LENGTH) codeRef.current?.focus();
      else if (password.length < MIN_PASSWORD_LENGTH) passwordRef.current?.focus();
      else confirmRef.current?.focus();
      announce(reason);
      return;
    }
    if (code === WRONG_CODE_DEMO) {
      haptics.warning();
      setCodeError("That code did not match. Check the latest email and try again.");
      requestAnimationFrame(() => {
        codeRef.current?.focus();
        codeRef.current?.setSelection(0, CODE_LENGTH);
      });
      return;
    }
    haptics.success();
    leaveAuthNotice({
      message: PASSWORD_CHANGED,
      tone: AUTH_WIRED.recovery ? "saved" : "neutral",
      email,
    });
    router.dismissTo({ pathname: "/sign-in", params: email ? { email } : {} });
  }

  return (
    <AuthScreen
      title="Choose a new password"
      lead="Verify the recovery code, then set a new password."
      testID="auth-reset"
      action={
        <Button
          label="Save new password"
          icon={reason ? "lock" : "check"}
          fullWidth
          disabled={Boolean(reason)}
          disabledReason={reason}
          onPress={submit}
          testID="auth-reset-submit"
        />
      }
      bottom={
        <>
          <Footnote>Changing your password does not touch the records on this device.</Footnote>
          {AUTH_WIRED.recovery ? null : (
            <PreviewLine>
              No password is changed yet. Any six digits continue; 000000 shows the wrong-code
              message.
            </PreviewLine>
          )}
        </>
      }
    >
      <FieldStack>
        <Field label="Six-digit recovery code" error={codeError}>
          <CodeInput
            ref={codeRef}
            kind="otp"
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setCodeError(undefined);
            }}
            // The number pad has no return key: a complete code moves on to the new password.
            onComplete={() => passwordRef.current?.focus()}
            testID="auth-reset-code"
          />
        </Field>
        <PasswordFields
          passwordLabel="New password"
          confirmLabel="Confirm new password"
          rule="At least 12."
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          passwordRef={passwordRef}
          confirmRef={confirmRef}
          onSubmit={submit}
          testID="auth-reset"
        />
      </FieldStack>
    </AuthScreen>
  );
}
