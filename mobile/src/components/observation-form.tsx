import { randomUUID } from "expo-crypto";
import { router, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccount } from "../auth/provider";
import { type Coordinate, countInputSchema, observationSchema } from "../domain/observation";
import { saveObservation } from "../storage/observation-store";
import { useSync } from "../sync/provider";
import { colors } from "../theme";
import { ActionButton } from "./action-button";

const inputStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  padding: 15,
  color: colors.ink,
  fontSize: 17,
  minHeight: 54,
} as const;
const labelStyle = { color: colors.ink, fontSize: 15, fontWeight: "600" } as const;

export function ObservationForm({ coordinates }: { readonly coordinates: Coordinate }) {
  const database = useSQLiteContext();
  const account = useAccount();
  const { wake } = useSync();
  const [owner] = useState(account.key);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [id] = useState(() => randomUUID());
  const [observer, setObserver] = useState("");
  const [people, setPeople] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const dirty = observer !== "" || people !== "" || notes !== "";
  usePreventRemove((dirty || saving) && !saved, ({ data }) => {
    if (saving) return;
    Alert.alert("Discard this draft?", "This observation has not been saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    if (saved) router.replace("/observations");
  }, [saved]);

  async function save() {
    if (savingRef.current) return;
    if (!account.ready || account.key !== owner) {
      setError("Your account changed. Close this form and open a new observation.");
      return;
    }
    const parsedCount = countInputSchema.safeParse(people);
    if (!parsedCount.success) {
      setError("Enter a whole number of people, from 0 to 999.");
      return;
    }
    const parsed = observationSchema.safeParse({
      id,
      siteId: "sample-garden",
      formVersion: "shell-v1",
      coordinates,
      observer,
      people: parsedCount.data,
      notes,
      createdAt: new Date().toISOString(),
      storageStatus: "local-only",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form values.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await saveObservation(database, parsed.data, owner);
      wake();
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Could not save: ${cause.message}`
          : "Could not save. Your form is still here; try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={70}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 24,
          gap: 22,
          paddingBottom: insets.bottom + 24,
          maxWidth: 640,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ gap: 6, padding: 16, backgroundColor: colors.soft, borderRadius: 14 }}>
          <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "600" }}>
            Sample garden · Test form
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
            {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
            Three practice fields. Janet’s full variable library comes next.
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text nativeID="observer-label" style={labelStyle}>
            Observer initials
          </Text>
          <TextInput
            accessibilityLabel="Observer initials"
            accessibilityLabelledBy="observer-label"
            value={observer}
            onChangeText={setObserver}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            placeholder="e.g. JL"
            placeholderTextColor={colors.muted}
            editable={!saving}
            style={inputStyle}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text nativeID="people-label" style={labelStyle}>
            People observed
          </Text>
          <TextInput
            accessibilityLabel="People observed"
            accessibilityLabelledBy="people-label"
            value={people}
            onChangeText={setPeople}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="0–999"
            placeholderTextColor={colors.muted}
            editable={!saving}
            style={inputStyle}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text nativeID="notes-label" style={labelStyle}>
            Field notes <Text style={{ color: colors.muted, fontWeight: "400" }}>(optional)</Text>
          </Text>
          <TextInput
            accessibilityLabel="Field notes"
            accessibilityLabelledBy="notes-label"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            placeholder="What do you notice?"
            placeholderTextColor={colors.muted}
            editable={!saving}
            style={[inputStyle, { minHeight: 120 }]}
          />
        </View>
        {error && (
          <Text
            selectable
            accessibilityRole="alert"
            style={{ color: colors.error, lineHeight: 22 }}
          >
            {error}
          </Text>
        )}
        <ActionButton
          label={saving ? "Saving…" : "Save on this device"}
          onPress={() => {
            void save();
          }}
          disabled={saving || saved || !account.ready || account.key !== owner}
        />
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
          {owner === "local"
            ? "Practice records stay on this device. Sign in before collecting project observations."
            : "Saved on this device first, then uploaded automatically when connected with the app open."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
