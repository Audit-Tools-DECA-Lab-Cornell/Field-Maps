import { useFonts } from "expo-font";
import { type ErrorBoundaryProps, Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../src/auth/provider";
import { PrimaryAction } from "../src/components/chrome";
import { ScreenMessage } from "../src/components/screen-message";
import { useOrientationPreference } from "../src/layout/orientation";
import { FieldSessionProvider } from "../src/session/provider";
import { initializeDatabase } from "../src/storage/observation-store";
import { SyncProvider } from "../src/sync/provider";
import { colors, space } from "../src/theme";
import { interFonts } from "../src/theme-fonts";
import { contourFonts } from "../src/ui/fonts";
import { PreferencesProvider } from "../src/ui/preferences";
import { ThemeProvider } from "../src/ui/theme";

/** Inter stays until the last legacy Nocturne screen is replaced; Contour screens use Geologica. */
const FONTS = { ...interFonts, ...contourFonts };

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, paddingVertical: 48, backgroundColor: colors.bg }}>
      <ScreenMessage title="FieldMaps could not open" detail={error.message} />
      <View style={{ padding: space.wide }}>
        <PrimaryAction label="Try again" onPress={retry} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  useOrientationPreference();
  // A missing face falls back to the system font rather than holding the collector shut.
  const [fontsReady, fontError] = useFonts(FONTS);
  return (
    // Preferences are read synchronously, so the first Contour frame is already in Day or Dusk.
    <GestureHandlerRootView style={styles.root}>
      <PreferencesProvider>
        <ThemeProvider>
          {!fontsReady && !fontError ? (
            <ScreenMessage title="Opening FieldMaps" detail="Preparing your local workspace…" />
          ) : (
            <Suspense
              fallback={
                <ScreenMessage title="Opening FieldMaps" detail="Preparing your local workspace…" />
              }
            >
              <SQLiteProvider
                databaseName="fieldmaps-shell.db"
                onInit={initializeDatabase}
                useSuspense
              >
                <AuthProvider>
                  <SyncProvider>
                    <FieldSessionProvider>
                      {/* Legacy screens are dark Nocturne. Contour screens set their own status
                          bar through the Screen primitive. */}
                      <StatusBar style="light" />
                      <Stack
                        screenOptions={{
                          headerShown: false,
                          contentStyle: { backgroundColor: colors.bg },
                          animation: "fade",
                        }}
                      />
                    </FieldSessionProvider>
                  </SyncProvider>
                </AuthProvider>
              </SQLiteProvider>
            </Suspense>
          )}
        </ThemeProvider>
      </PreferencesProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
