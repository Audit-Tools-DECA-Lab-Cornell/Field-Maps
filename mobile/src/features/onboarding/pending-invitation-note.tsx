import { router } from "expo-router";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import {
  announce,
  Button,
  type IconName,
  Mono,
  Note,
  Text,
  TextLink,
  type Theme,
  useStyles,
} from "../../ui";
import { pendingInvitationMessage } from "./pending-invitation";
import { usePendingInvitation } from "./pending-invitation-store";

function noteStyles(t: Theme) {
  return StyleSheet.create({
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: t.space.s5,
      rowGap: t.space.s3,
      marginTop: t.space.s2,
    },
  });
}

const ICON: IconName = "mail";

/**
 * On welcome, sign in and create account: "Invitation DECA2026 is waiting. Sign in or create an account
 * to see it." The code came from a link opened while signed out; it waits on this device for a week and
 * opens after sign-in. "Forget this invitation" removes it. Nothing shows when no code is waiting.
 */
export function PendingInvitationNote({ style }: { style?: StyleProp<ViewStyle> }) {
  const { code, forget } = usePendingInvitation();
  if (!code) return null;
  return (
    <Note
      tone="neutral"
      icon={ICON}
      style={style}
      action={
        <TextLink
          label="Forget this invitation"
          tone="ink"
          onPress={() => {
            forget();
            announce(`Invitation ${code} forgotten.`);
          }}
          testID="pending-invitation-forget"
        />
      }
      testID="pending-invitation-note"
    >
      <Text accessibilityLabel={pendingInvitationMessage(code)}>
        {"Invitation "}
        <Mono size="body">{code}</Mono>
        {" is waiting. Sign in or create an account to see it."}
      </Text>
    </Note>
  );
}

/**
 * On Projects, for an account that was already set up when the link arrived: the code waits here until
 * it is joined or forgotten. "Join with a code" opens the join screen with it filled in; nothing is
 * joined until the invitation is confirmed there.
 */
export function PendingInvitationProjectsNote() {
  const s = useStyles(noteStyles);
  const { code, forget } = usePendingInvitation();
  if (!code) return null;
  return (
    <Note
      tone="neutral"
      icon={ICON}
      title={`Invitation ${code} is waiting.`}
      testID="projects-pending-invitation"
      action={
        <View style={s.actions}>
          <Button
            variant="ink"
            size="sm"
            label="Join with a code"
            iconRight="arrow-right"
            onPress={() => router.push({ pathname: "/join-project", params: { code } })}
            testID="projects-join-pending"
          />
          <TextLink
            label="Forget this invitation"
            tone="ink"
            onPress={() => {
              forget();
              announce(`Invitation ${code} forgotten.`);
            }}
          />
        </View>
      }
    >
      See the project before you join it.
    </Note>
  );
}
