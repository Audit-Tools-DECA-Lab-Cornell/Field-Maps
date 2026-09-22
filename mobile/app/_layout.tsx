import { type ErrorBoundaryProps, Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense } from "react";
import { View } from "react-native";
import { AuthProvider } from "../src/auth/provider";
import { ActionButton } from "../src/components/action-button";
import { ScreenMessage } from "../src/components/screen-message";
import { initializeDatabase } from "../src/storage/observation-store";
import { SyncProvider } from "../src/sync/provider";
import { colors } from "../src/theme";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, paddingVertical: 48, backgroundColor: colors.canvas }}>
      <ScreenMessage title="FieldOps could not open" detail={error.message} />
      <View style={{ padding: 24 }}>
        <ActionButton label="Try again" onPress={retry} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense
      fallback={<ScreenMessage title="Opening FieldOps" detail="Preparing your local workspace…" />}
    >
      <SQLiteProvider databaseName="fieldops-shell.db" onInit={initializeDatabase} useSuspense>
        <AuthProvider>
          <SyncProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.canvas },
                headerTintColor: colors.ink,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.canvas },
                headerBackButtonDisplayMode: "minimal",
              }}
            >
              <Stack.Screen name="index" options={{ title: "FieldOps" }} />
              <Stack.Screen name="collect" options={{ title: "Sample garden" }} />
              <Stack.Screen
                name="observe"
                options={{ title: "New observation", presentation: "modal" }}
              />
              <Stack.Screen name="observations" options={{ title: "Saved observations" }} />
              <Stack.Screen name="account" options={{ title: "Account" }} />
            </Stack>
          </SyncProvider>
        </AuthProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
