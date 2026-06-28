import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { colors } from "./src/theme";
import { RootStackParamList } from "./src/navigation";
import HomeScreen from "./src/screens/HomeScreen";
import EditAlarmScreen from "./src/screens/EditAlarmScreen";
import AlarmRingingScreen from "./src/screens/AlarmRingingScreen";
import ChallengeScreen from "./src/screens/ChallengeScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import {
  requestNotificationPermissions,
  setupAndroidAlarmChannel,
} from "./src/alarmScheduler";
import { loadAlarms, getSkippedPaywall, setSkippedPaywall } from "./src/storage";
import { startAlarmSound } from "./src/alarmSound";
import {
  initRevenueCat,
  getSubscriptionStatus,
  addSubscriptionListener,
} from "./src/subscription";

// ─── Background Task (solo nativo) ───────────────────────────────────────────
const BACKGROUND_NOTIFICATION_TASK = "ALARM_BACKGROUND_TASK";

if (Platform.OS !== "web") {
  const TaskManager = require("expo-task-manager");
  TaskManager.defineTask(
    BACKGROUND_NOTIFICATION_TASK,
    async ({ data, error }: { data: unknown; error: unknown }) => {
      if (error) {
        console.warn("[BackgroundTask] Error:", error);
        return;
      }
      try {
        await startAlarmSound();
      } catch (e) {
        console.warn("[BackgroundTask] startAlarmSound failed:", e);
      }
    }
  );
}

// ─── Configurazione foreground ────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator<RootStackParamList>();

async function navigateToAlarm(
  alarmId: string,
  navRef: React.RefObject<NavigationContainerRef<RootStackParamList>>
) {
  const alarms = await loadAlarms();
  const alarm = alarms.find((a) => a.id === alarmId);
  if (!alarm) return;

  const currentRoute = navRef.current?.getCurrentRoute();
  if (
    currentRoute?.name === "AlarmRinging" ||
    currentRoute?.name === "Challenge"
  ) {
    await startAlarmSound();
    return;
  }

  navRef.current?.reset({
    index: 1,
    routes: [{ name: "Home" }, { name: "AlarmRinging", params: { alarm } }],
  });

  await startAlarmSound();
}

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null); // null = loading
  const [skipped, setSkipped] = useState(false);

  // ── Inizializza RevenueCat e controlla stato abbonamento ──────────────────
  useEffect(() => {
    (async () => {
      await initRevenueCat();
      const [status, didSkip] = await Promise.all([
        getSubscriptionStatus(),
        getSkippedPaywall(),
      ]);
      setSkipped(didSkip);
      setSubscribed(status.isActive);
    })();

    const unsub = addSubscriptionListener((status) => {
      setSubscribed(status.isActive);
    });
    return unsub;
  }, []);

  // ── Notifiche e background task (solo nativo) ─────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;

    setupAndroidAlarmChannel();
    requestNotificationPermissions().then(async (granted) => {
      if (granted) {
        try {
          const Notifs = require("expo-notifications");
          await Notifs.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        } catch (e) {
          console.warn("[App] registerTaskAsync:", e);
        }
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const alarmId = response.notification.request.content.data
          ?.alarmId as string | undefined;
        if (!alarmId) return;
        setTimeout(() => navigateToAlarm(alarmId, navigationRef), 300);
      }
    );

    const receivedSub = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const alarmId = notification.request.content.data
          ?.alarmId as string | undefined;
        if (!alarmId) return;
        await navigateToAlarm(alarmId, navigationRef);
      }
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const alarmId = response.notification.request.content.data
        ?.alarmId as string | undefined;
      if (!alarmId) return;
      setTimeout(() => navigateToAlarm(alarmId, navigationRef), 500);
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (subscribed === null) {
    // Schermata di avvio — un render vuoto è ok, si risolve in <200ms
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // ── Paywall (utente non abbonato e non ha skippato) ──────────────────────
  if (!subscribed && !skipped) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <PaywallScreen
          onSubscribed={() => setSubscribed(true)}
          onSkip={async () => {
            await setSkippedPaywall();
            setSkipped(true);
          }}
        />
      </SafeAreaProvider>
    );
  }

  // ── App principale ────────────────────────────────────────────────────────
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="EditAlarm" component={EditAlarmScreen} />
          <Stack.Screen
            name="AlarmRinging"
            component={AlarmRingingScreen}
            options={{ animation: "fade", gestureEnabled: false }}
          />
          <Stack.Screen
            name="Challenge"
            component={ChallengeScreen}
            options={{ animation: "slide_from_bottom", gestureEnabled: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ animation: "slide_from_right" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
