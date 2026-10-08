import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useMe } from "../../data/api/me-provider";
import { Avatar, Text, type Theme, useStyles } from "../../ui";
import { PreviewLine } from "../auth/parts";
import { useProfile } from "../auth/profile-store";
import { PREVIEW_ACCOUNT, useDataSource } from "../preview";

/** The observer's initials for the header mark: preview's PS, otherwise this device's or the server's. */
export function useAccountInitials(): { initials: string; name: string } {
  const { mode } = useDataSource();
  const profile = useProfile();
  const me = useMe();
  if (mode === "preview") return { initials: PREVIEW_ACCOUNT.initials, name: PREVIEW_ACCOUNT.name };
  const initials = profile.initials || me.profile?.observer_initials || "";
  const name = profile.name || me.profile?.display_name || "";
  return { initials, name };
}

/** The account mark at the right of a Projects header (Mobile 10, 11): opens the Account tab. */
export function AccountMark() {
  const { initials, name } = useAccountInitials();
  if (!initials) return null;
  return (
    <Avatar
      initials={initials}
      name={name || undefined}
      onPress={() => router.navigate("/account")}
      accessibilityLabel={`Account${name ? `, ${name}` : ""}`}
      testID="projects-account"
    />
  );
}

function introStyles(t: Theme) {
  return StyleSheet.create({
    intro: { gap: t.space.s2 },
    title: { gap: t.space.s1 },
    preview: { marginTop: t.space.s1 },
  });
}

/** A screen's heading block: the mono eyebrow ("DECA LAB · PROJECT"), the title and its lead. */
export function PageIntro({
  eyebrow,
  title,
  lead,
  trailing,
}: {
  eyebrow?: string | undefined;
  title: string;
  lead?: ReactNode;
  trailing?: ReactNode;
}) {
  const s = useStyles(introStyles);
  return (
    <View style={s.intro}>
      <View style={s.title}>
        {eyebrow ? (
          <Text variant="monoLabel" tone="ink2">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="page" header>
          {title}
        </Text>
      </View>
      {lead || trailing ? (
        <LeadLine trailing={trailing}>
          {typeof lead === "string" ? (
            <Text variant="body" tone="ink2">
              {lead}
            </Text>
          ) : (
            lead
          )}
        </LeadLine>
      ) : null}
    </View>
  );
}

function leadStyles(t: Theme) {
  return StyleSheet.create({
    line: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: t.space.s4,
      rowGap: t.space.s3,
    },
    words: { flexGrow: 1, flexShrink: 1, flexBasis: 200 },
  });
}

function LeadLine({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  const s = useStyles(leadStyles);
  if (!trailing) return <>{children}</>;
  return (
    <View style={s.line}>
      <View style={s.words}>{children}</View>
      {trailing}
    </View>
  );
}

/** "PREVIEW · Sample data …", on every screen that shows the designed fixtures instead of this device. */
export function PreviewData({ children }: { children?: string | undefined }) {
  const { mode } = useDataSource();
  const s = useStyles(introStyles);
  if (mode !== "preview") return null;
  return (
    <View style={s.preview}>
      <PreviewLine>
        {children ??
          "Sample projects and sites. Nothing here is read from or written to the FieldMaps database."}
      </PreviewLine>
    </View>
  );
}
