import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { type TextInput as NativeTextInput, StyleSheet, View } from "react-native";
import { useAccount } from "../../src/auth/provider";
import { useProfile } from "../../src/features/auth/profile-store";
import { RecordedAs, StepIntro } from "../../src/features/onboarding/components";
import {
  INITIALS_MAX,
  initialsProblem,
  NAME_MAX,
  nameProblem,
  suggestInitials,
  typedInitials,
} from "../../src/features/onboarding/identity";
import { JOIN_CODE_LENGTH, joinCodeOf } from "../../src/features/onboarding/invitation";
import {
  Button,
  Field,
  Screen,
  ScreenHeader,
  StepBars,
  TextInput,
  type Theme,
  useStyles,
} from "../../src/ui";

/** A name the account already carries, from sign-up metadata, to save typing it twice. */
function accountName(metadata: Record<string, unknown> | undefined): string {
  const { full_name: fullName, name } = metadata ?? {};
  const value = fullName ?? name;
  return typeof value === "string" ? value : "";
}

/**
 * Onboarding step 1 of 2 (mobile-29): the full name and the observer initials. The initials are
 * suggested from the name until the observer types their own, and "Recorded as" shows them live.
 * Errors appear after a field is left or a submit is tried, never on the first keystroke.
 */
export default function ProfileStep() {
  const s = useStyles(makeStyles);
  const params = useLocalSearchParams<{ code?: string }>();
  // An invitation link that arrived before the identity was saved carries on to that invitation.
  const linkedCode = joinCodeOf(params.code);
  const profile = useProfile();
  const { session } = useAccount();

  const [name, setName] = useState(() => profile.name || accountName(session?.user.user_metadata));
  const [initials, setInitials] = useState(() => profile.initials || suggestInitials(name));
  const [initialsEdited, setInitialsEdited] = useState(() => profile.initials !== "");
  const [touched, setTouched] = useState({ name: false, initials: false });
  const [attempted, setAttempted] = useState(false);
  const nameRef = useRef<NativeTextInput>(null);
  const initialsRef = useRef<NativeTextInput>(null);

  const nameError = nameProblem(name);
  const initialsError = initialsProblem(initials);
  const valid = nameError === undefined && initialsError === undefined;

  function changeName(value: string) {
    setName(value);
    if (!initialsEdited) setInitials(suggestInitials(value));
  }

  function changeInitials(value: string) {
    setInitialsEdited(true);
    setInitials(typedInitials(value));
  }

  function submit() {
    if (!valid) {
      setAttempted(true);
      (nameError ? nameRef : initialsRef).current?.focus();
      return;
    }
    if (!profile.set(name, initials)) return;
    if (linkedCode.length === JOIN_CODE_LENGTH)
      router.push({ pathname: "/invitation/[code]", params: { code: linkedCode } });
    else router.push("/join");
  }

  return (
    <Screen
      scroll
      keyboard
      testID="onboarding-profile"
      footer={
        <Button
          label="Continue to join a project"
          iconRight="arrow-right"
          fullWidth
          disabled={!valid}
          disabledReason="The button turns on when your name and initials are filled in."
          onPress={submit}
          testID="onboarding-profile-continue"
        />
      }
    >
      <ScreenHeader trailing={<StepBars count={2} current={1} />} style={s.header} />
      <View style={s.body}>
        <StepIntro
          title="Your observer identity"
          lead="Your initials are recorded with every new observation. Historical records keep their original code."
        />
        <View style={s.fields}>
          <Field label="Full name" error={touched.name || attempted ? nameError : undefined}>
            <TextInput
              ref={nameRef}
              value={name}
              onChangeText={changeName}
              onBlur={() => setTouched((current) => ({ ...current, name: true }))}
              maxLength={NAME_MAX}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => initialsRef.current?.focus()}
              testID="onboarding-name"
            />
          </Field>
          <Field
            label="Observer initials"
            hint="Up to 10 uppercase characters."
            error={touched.initials || attempted ? initialsError : undefined}
          >
            <TextInput
              ref={initialsRef}
              value={initials}
              onChangeText={changeInitials}
              onBlur={() => setTouched((current) => ({ ...current, initials: true }))}
              placeholder="e.g. PS"
              maxLength={INITIALS_MAX}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              returnKeyType="go"
              onSubmitEditing={submit}
              testID="onboarding-initials"
            />
          </Field>
          <View style={s.panel}>
            <RecordedAs initials={initials} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    // The title sits where the auth screens put theirs (mobile-24 to 29): 24 under the header.
    header: { marginBottom: t.space.s6 },
    body: { gap: t.space.s6 },
    // Fields 16 apart; the "Recorded as" panel keeps 20 (mobile-29).
    fields: { gap: t.space.s4 },
    panel: { marginTop: t.space.s1 },
  });
}
