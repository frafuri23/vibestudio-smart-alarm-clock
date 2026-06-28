import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, radius, font } from "../theme";
import { loadAlarms, saveAlarms } from "../storage";
import { Alarm, Weekday } from "../types";
import { RootStackParamList } from "../navigation";
import { scheduleAlarm, cancelAlarm, syncAllAlarms, requestNotificationPermissions } from "../alarmScheduler";
import { startAlarmSound, stopAlarmSound } from "../alarmSound";
import { getToneById } from "../alarmTones";

const DAY_LABELS = ["L", "M", "M", "G", "V", "S", "D"];

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  // id della sveglia la cui suoneria è in riproduzione (null = nessuna)
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playingIdRef = useRef<string | null>(null);

  // Ferma il suono se schermata perde il focus (es. naviga ad AlarmRinging)
  useFocusEffect(
    useCallback(() => {
      loadAlarms().then((loaded) => {
        setAlarms(loaded);
        syncAllAlarms(loaded);
        requestNotificationPermissions();
      });
      return () => {
        // Quando si lascia la Home ferma qualsiasi preview in corso
        if (playingIdRef.current) {
          stopAlarmSound();
          playingIdRef.current = null;
          setPlayingId(null);
        }
      };
    }, [])
  );

  const toggleAlarm = async (id: string) => {
    const updated = alarms.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    setAlarms(updated);
    await saveAlarms(updated);
    const changed = updated.find((a) => a.id === id);
    if (changed) {
      if (changed.enabled) {
        await scheduleAlarm(changed);
      } else {
        await cancelAlarm(changed.id);
      }
    }
  };

  const deleteAlarm = (id: string) => {
    Alert.alert("Elimina sveglia", "Sei sicuro di voler eliminare questa sveglia?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          // Ferma il preview se stava suonando questa sveglia
          if (playingIdRef.current === id) {
            await stopAlarmSound();
            playingIdRef.current = null;
            setPlayingId(null);
          }
          await cancelAlarm(id);
          const updated = alarms.filter((a) => a.id !== id);
          setAlarms(updated);
          await saveAlarms(updated);
        },
      },
    ]);
  };

  /** Avvia o ferma la preview della suoneria per una sveglia. */
  const toggleSoundPreview = async (alarm: Alarm) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Audio non disponibile",
        "Il preview audio funziona solo sul dispositivo fisico, non nel browser."
      );
      return;
    }
    const id = alarm.id;
    if (playingIdRef.current === id) {
      // Stava già suonando questa: fermala
      await stopAlarmSound();
      playingIdRef.current = null;
      setPlayingId(null);
    } else {
      // Ferma eventuale altra sveglia in preview, poi avvia questa
      if (playingIdRef.current) {
        await stopAlarmSound();
      }
      playingIdRef.current = id;
      setPlayingId(id);
      await startAlarmSound(alarm.soundId);
      // Auto-stop dopo 10 secondi così non resta in loop per sempre
      setTimeout(async () => {
        if (playingIdRef.current === id) {
          await stopAlarmSound();
          playingIdRef.current = null;
          setPlayingId(null);
        }
      }, 10000);
    }
  };

  const formatTime = (hour: number, minute: number) => {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const renderAlarm = ({ item }: { item: Alarm }) => {
    const isPlaying = playingId === item.id;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.navigate("EditAlarm", { alarm: item })}
        onLongPress={() => deleteAlarm(item.id)}
      >
        <View style={styles.cardLeft}>
          <Text style={[styles.timeText, !item.enabled && styles.timeTextDisabled]}>
            {formatTime(item.hour, item.minute)}
          </Text>
          <Text style={styles.labelText} numberOfLines={1}>
            {item.label || "Sveglia"}
          </Text>
          <View style={styles.toneTag}>
            <Ionicons name={getToneById(item.soundId).icon as any} size={11} color={colors.textDim} />
            <Text style={styles.toneTagText}>{getToneById(item.soundId).label}</Text>
          </View>
          <View style={styles.daysRow}>
            {DAY_LABELS.map((d, i) => {
              const active = item.days.includes(i as Weekday);
              return (
                <View key={i} style={[styles.dayDot, active && styles.dayDotActive]}>
                  <Text style={[styles.dayDotText, active && styles.dayDotTextActive]}>
                    {d}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Switch
            value={item.enabled}
            onValueChange={() => toggleAlarm(item.id)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={item.enabled ? colors.white : colors.bgCardAlt}
          />
          {/* Pulsante prova suoneria */}
          <TouchableOpacity
            style={[styles.testBtn, isPlaying && styles.testBtnActive]}
            onPress={() => toggleSoundPreview(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPlaying ? "stop-circle" : "play-circle-outline"}
              size={24}
              color={isPlaying ? colors.accent : colors.textSub}
            />
          </TouchableOpacity>
          {/* Pulsante naviga ad AlarmRinging (test schermata) */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => navigation.navigate("AlarmRinging", { alarm: item })}
            activeOpacity={0.7}
          >
            <Ionicons name="alarm-outline" size={22} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sveglie</Text>
          <Text style={styles.headerSub}>
            {alarms.filter((a) => a.enabled).length} attive
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSub} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        renderItem={renderAlarm}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="alarm-outline" size={64} color={colors.textDim} />
            <Text style={styles.emptyTitle}>Nessuna sveglia</Text>
            <Text style={styles.emptySub}>
              Tocca il pulsante + per aggiungere la tua prima sveglia
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => navigation.navigate("EditAlarm", { alarm: null })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: font.xxl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: font.sm,
    color: colors.textSub,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardRight: {
    alignItems: "center",
    gap: spacing.sm,
  },
  timeText: {
    fontSize: 42,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 48,
  },
  timeTextDisabled: {
    color: colors.textDim,
  },
  labelText: {
    fontSize: font.md,
    color: colors.textSub,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  daysRow: {
    flexDirection: "row",
    gap: 5,
  },
  dayDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bgCardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotActive: {
    backgroundColor: colors.accent,
  },
  dayDotText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textDim,
  },
  dayDotTextActive: {
    color: colors.white,
  },
  testBtn: {
    padding: 4,
    borderRadius: radius.sm,
  },
  testBtnActive: {
    backgroundColor: colors.accent + "18",
  },
  toneTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: spacing.sm,
  },
  toneTagText: {
    fontSize: font.xs,
    color: colors.textDim,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.textSub,
  },
  emptySub: {
    fontSize: font.md,
    color: colors.textDim,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
