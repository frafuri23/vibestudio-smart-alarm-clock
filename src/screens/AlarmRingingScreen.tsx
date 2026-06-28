import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, radius, font } from "../theme";
import { Alarm } from "../types";
import { RootStackParamList } from "../navigation";
import { startAlarmSound, stopAlarmSound } from "../alarmSound";

type Nav = NativeStackNavigationProp<RootStackParamList, "AlarmRinging">;
type Route = RouteProp<RootStackParamList, "AlarmRinging">;

export default function AlarmRingingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const alarm = route.params.alarm;

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  // Avvia suoneria all'apertura, la ferma quando si esce
  useEffect(() => {
    startAlarmSound(alarm.soundId);
    return () => {
      stopAlarmSound();
    };
  }, []);

  // Pulsating ring animation
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.6)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale1, {
            toValue: 1.6,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity1, {
            toValue: 0,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(scale2, {
            toValue: 1.6,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 0,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale2, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse1.start();
    pulse2.start();
    return () => {
      pulse1.stop();
      pulse2.stop();
    };
  }, []);

  const displayTime = formatTime(alarm.hour, alarm.minute);

  const handleStartChallenge = async () => {
    // Non fermiamo il suono qui: lo fermerà ChallengeScreen al successo
    navigation.replace("Challenge", { alarm });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Background pulses */}
      <View style={styles.pulseContainer} pointerEvents="none">
        <Animated.View
          style={[styles.pulse, { transform: [{ scale: scale1 }], opacity: opacity1 }]}
        />
        <Animated.View
          style={[styles.pulse, { transform: [{ scale: scale2 }], opacity: opacity2 }]}
        />
      </View>

      {/* Clock */}
      <View style={styles.clockSection}>
        <Ionicons name="alarm" size={36} color={colors.accent} />
        <Text style={styles.timeHero}>{displayTime}</Text>
        <Text style={styles.alarmLabel}>{alarm.label || "Sveglia"}</Text>
      </View>

      {/* Message */}
      <View style={styles.messageSection}>
        <View style={styles.messageCard}>
          <Ionicons name="camera" size={28} color={colors.accent} />
          <Text style={styles.messageTitle}>Per spegnere la sveglia</Text>
          <Text style={styles.messageSub}>
            Dovrai fotografare un oggetto casuale di casa. Non ci sono scorciatoie!
          </Text>
          {Platform.OS === "web" && (
            <Text style={styles.webNote}>
              L&apos;audio suona sul dispositivo fisico, non nel preview web.
            </Text>
          )}
        </View>
      </View>

      {/* Action button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.challengeBtn}
          onPress={handleStartChallenge}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={22} color={colors.white} />
          <Text style={styles.challengeBtnText}>Avvia sfida foto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "space-between",
  },
  pulseContainer: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    opacity: 0.18,
  },
  clockSection: {
    alignItems: "center",
    marginTop: 80,
    gap: spacing.md,
  },
  timeHero: {
    fontSize: 96,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -4,
    lineHeight: 100,
  },
  alarmLabel: {
    fontSize: font.xl,
    fontWeight: "600",
    color: colors.textSub,
    letterSpacing: -0.3,
  },
  messageSection: {
    width: "100%",
    paddingHorizontal: spacing.lg,
  },
  messageCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageTitle: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  messageSub: {
    fontSize: font.md,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  webNote: {
    fontSize: font.sm,
    color: colors.textDim,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },
  bottomSection: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  challengeBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  challengeBtnText: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.3,
  },
});
