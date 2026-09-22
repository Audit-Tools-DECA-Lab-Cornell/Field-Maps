import { useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { useAccount } from "../src/auth/provider";
import { ActionButton } from "../src/components/action-button";
import { useSync } from "../src/sync/provider";
import { colors } from "../src/theme";

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
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 24, gap: 20 }}
    >
      <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "600" }}>
        Account and synchronization
      </Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>
        {!configured
          ? "Practice mode: records stay on this device. Your project connection needs to be configured before signing in."
          : !ready
            ? "Restoring your account…"
            : session
              ? `Signed in as ${session.user.email ?? "project member"}. Saved observations upload automatically while the app is open and connected.`
              : account
                ? `Offline workspace for ${account.email ?? "your account"}. You can keep collecting. Sign in again if uploads cannot resume when connected.`
                : "Sign in before collecting project records. Practice records stay separate and are never uploaded automatically."}
      </Text>
      {client && ready && !session && (
        <>
          <TextInput
            accessibilityLabel="Email"
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            style={{ padding: 16, backgroundColor: colors.surface, color: colors.ink }}
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            style={{ padding: 16, backgroundColor: colors.surface, color: colors.ink }}
          />
        </>
      )}
      {[setupError, syncError, error].filter(Boolean).map((message) => (
        <Text key={message} accessibilityRole="alert" style={{ color: colors.error }}>
          {message}
        </Text>
      ))}
      {client && ready && (
        <ActionButton
          label={busy ? "Please wait…" : session ? "Sign out on this device" : "Sign in"}
          disabled={busy || (!session && (!email.trim() || !password))}
          onPress={() => {
            void submit();
          }}
        />
      )}
      {session && (
        <ActionButton
          label="Retry pending uploads"
          secondary
          onPress={() => {
            void retry().catch(() => setError("Could not retry. Reopen the app and try again."));
          }}
        />
      )}
      <Text style={{ color: colors.muted, lineHeight: 22 }}>
        Signing out keeps pending records on this device for the same account. Reopen the app after
        reconnecting to resume uploads. Closed-app background synchronization is not enabled.
      </Text>
    </ScrollView>
  );
}
