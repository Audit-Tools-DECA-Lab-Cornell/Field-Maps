import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAccount } from "../src/auth/provider";
import {
  AttentionNote,
  FadeRule,
  GhostAction,
  LinkAction,
  PrimaryAction,
  Prose,
  SectionLabel,
} from "../src/components/chrome";
import { PageScreen } from "../src/components/screen";
import { useSync } from "../src/sync/provider";
import { colors, fonts, radius, space, textStyles } from "../src/theme";

const field = {
  backgroundColor: colors.neutral900,
  borderRadius: radius.md + 2,
  paddingHorizontal: 13,
  minHeight: 48,
  color: colors.text,
  fontFamily: fonts.regular,
  fontSize: 15,
} as const;

export default function AccountScreen() {
  const { client, session, account, ready, configured, error: setupError } = useAccount();
  const { error: syncError, retry } = useSync();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!client || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = session
        ? await client.auth.signOut({ scope: "local" })
        : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error)
        setError(
          session
            ? "Could not sign out. Try again."
            : "Could not sign in. Check your email, password, and connection.",
        );
      else setPassword("");
    } catch {
      setError("The connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageScreen>
      <LinkAction label="← Studies" muted onPress={() => router.navigate("/")} />
      <Text style={[textStyles.title, { color: colors.text, marginTop: space.snug }]}>
        Account and synchronisation
      </Text>
      <View style={{ marginTop: space.tight, maxWidth: 520 }}>
        <Prose tone="body">
          {!configured
            ? "Practice mode: records stay on this device. Your project connection needs to be configured before signing in."
            : !ready
              ? "Restoring your account…"
              : session
                ? `Signed in as ${session.user.email ?? "project member"}. Saved observations upload automatically while the app is open and connected.`
                : account
                  ? `Offline workspace for ${account.email ?? "your account"}. You can keep collecting. Sign in again if uploads cannot resume when connected.`
                  : "Sign in before collecting project records. Practice records stay separate and are never uploaded automatically."}
        </Prose>
      </View>

      {client && ready && !session && (
        <View style={{ marginTop: space.loose, gap: space.snug }}>
          <SectionLabel>Sign in</SectionLabel>
          <TextInput
            accessibilityLabel="Email"
            placeholder="Email"
            placeholderTextColor={colors.neutral600}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            style={field}
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            placeholderTextColor={colors.neutral600}
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            style={field}
          />
        </View>
      )}

      <View style={{ gap: space.snug, marginTop: space.base }}>
        {[setupError, syncError, error]
          .filter((message): message is string => typeof message === "string" && message !== "")
          .map((message) => (
            <AttentionNote key={message} role="alert" title={message} />
          ))}
      </View>

      {client && ready && (
        <PrimaryAction
          label={busy ? "Please wait…" : session ? "Sign out on this device" : "Sign in"}
          disabled={busy || (!session && (!email.trim() || !password))}
          onPress={() => {
            void submit();
          }}
          style={{ marginTop: space.base }}
        />
      )}
      {session && (
        <GhostAction
          label="Retry records that need attention"
          onPress={() => {
            void retry().catch(() => setError("Could not retry. Reopen the app and try again."));
          }}
          style={{ marginTop: space.snug }}
        />
      )}

      <FadeRule />
      <Prose tone="faint">
        Signing out keeps pending records on this device for the same account. Reopen the app after
        reconnecting to resume uploads; a session that expires mid-upload resumes once you sign in
        again. Closed-app background synchronisation is not enabled.
      </Prose>
    </PageScreen>
  );
}
