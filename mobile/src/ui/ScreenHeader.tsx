import { useRouter } from "expo-router";
import { isValidElement, type ReactNode, useCallback } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Avatar } from "./Avatar";
import { IconButton } from "./IconButton";
import { Logo } from "./Logo";
import { OnlineIndicator } from "./OnlineIndicator";
import { Text } from "./Text";
import { type Theme, useStyles } from "./theme";

export type ScreenHeaderProps = {
  /** The 48 px back circle: true goes back in the stack; a function handles it. */
  back?: boolean | (() => void) | undefined;
  /** close: an ✕ that leaves a flow (collect) instead of stepping back. */
  backIcon?: "back" | "close" | undefined;
  /** Overrides "Back" / "Close" for screen readers. */
  backLabel?: string | undefined;
  /** A title beside the back circle, for flows: "Riverside". */
  title?: string | undefined;
  /** Under the title: "North meadow · Round 1". */
  subtitle?: string | undefined;
  /** At the right, before the Online indicator and avatar: a state, the logo mark, mono versions. */
  trailing?: ReactNode;
  /** Shows the Online / Offline indicator at the right. */
  showOnline?: boolean | undefined;
  /** The account mark at the far right: initials, or an Avatar node (pressable to open the account). */
  avatar?: ReactNode;
  /** The DECA Mark lockup at the left of a tab root. On by default when there is no back circle or title. */
  logo?: boolean | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

function headerStyles(t: Theme) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.s3,
      minHeight: t.size.touch,
      marginBottom: t.space.s4,
    },
    title: { flex: 1 },
    spacer: { flex: 1 },
    end: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: t.space.s4,
      flexShrink: 1,
    },
  });
}

/**
 * The top of a collector screen (mobile-10 to 16): the back circle or the DECA Mark lockup at the left,
 * the connection, a state and the account at the right. It sits inside Screen, below the safe area.
 */
export function ScreenHeader({
  back,
  backIcon = "back",
  backLabel,
  title,
  subtitle,
  trailing,
  showOnline = false,
  avatar,
  logo,
  style,
  testID,
}: ScreenHeaderProps) {
  const s = useStyles(headerStyles);
  const router = useRouter();
  const goBack = useCallback(() => {
    if (typeof back === "function") back();
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [back, router]);
  const showLogo = logo ?? (!back && !title);

  const avatarNode =
    typeof avatar === "string" ? (
      <Avatar initials={avatar} />
    ) : isValidElement(avatar) ? (
      avatar
    ) : null;

  return (
    <View testID={testID} style={[s.header, style]}>
      {back ? (
        <IconButton
          icon={backIcon === "close" ? "x" : "arrow-left"}
          label={backLabel ?? (backIcon === "close" ? "Close" : "Back")}
          variant="outline"
          onPress={goBack}
        />
      ) : null}
      {showLogo ? <Logo wordmark /> : null}
      {title ? (
        <View style={s.title}>
          <Text variant="island" header>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="ink2">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={s.spacer} />
      )}
      {trailing || showOnline || avatarNode ? (
        <View style={s.end}>
          {trailing ?? null}
          {showOnline ? <OnlineIndicator /> : null}
          {avatarNode}
        </View>
      ) : null}
    </View>
  );
}
