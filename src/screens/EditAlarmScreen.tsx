import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, radius, font } from "../theme";
import { loadAlarms, saveAlarms } from "../storage";
import { Alarm, Weekday } from "../types";
import { RootStackParamList } from "../navigation";
import { scheduleAlarm } from "../alarmScheduler";
import { ALARM_TONES, DEFAULT_TONE_ID, getToneById } from "../alarmTones";
import { startAlarmSound, stopAlarmSound } from "../alarmSound";

type Nav = NativeStackNavigationProp<RootStackParamList, "EditAlarm">;
type Route = RouteProp<RootStackParamList, "EditAlarm">;

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function TimeWheel({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange((value - 1 + max) % max);
  const inc = () => onChange((value + 1) % max);

  return (
    <View style={wheelStyles.col}>
      <TouchableOpacity onPress={inc} style={wheelStyles.btn} activeOpacity={0.7}>
        <Ionicons name="chevron-up" size={22} color={colors.accent} />
      </TouchableOpacity>
      <Text style={wheelStyles.val}>{String(value).padStart(2, "0")}</Text>
      <TouchableOpacity onPress={dec} style={wheelStyles.btn} activeOpacity={0.7}>
        <Ionicons name="chevron-down" size={22} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  col: { alignItems: "center", gap: 4 },
  btn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  val: {
    fontSize: 64,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 72,
  },
});

export default function EditAlarmScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const existing = route.params?.alarm ?? null;

  const [label, setLabel] = useState(existing?.label ?? "");
  const [hour, setHour] = useState(existing?.hour ?? 7);
  const [minute, setMinute] = useState(existing?.minute ?? 0);
  const [days, setDays] = useState<Weekday[]>(
    existing?.days ?? [0, 1, 2, 3, 4]
  );
  const [soundId, setSoundId] = useState<string>(
    existing?.soundId ?? DEFAULT_TONE_ID
  );

  // Ref per gestire il preview audio
  const previewingRef = useRef<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const toggleDay = (d: Weekday) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const stopPreview = async () => {
    if (previewingRef.current) {
      await stopAlarmSound();
      previewingRef.current = null;
      setPreviewingId(null);
    }
  };

  const previewTone = async (toneId: string) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Audio non disponibile",
        "Il preview audio funziona solo sul dispositivo fisico."
      );
      return;
    }
    // Se sta già suonando questo tono, fermalo
    if (previewingRef.current === toneId) {
      await stopPreview();
      return;
    }
    // Ferma eventuale preview in corso
    await stopPreview();

    previewingRef.current = toneId;
    setPreviewingId(toneId);
    await startAlarmSound(toneId);

    // Auto-stop dopo 6 secondi
    setTimeout(async () => {
      if (previewingRef.current === toneId) {
        await stopAlarmSound();
        previewingRef.current = null;
        setPreviewingId(null);
      }
    }, 6000);
  };

  const selectTone = async (toneId: string) => {
    setSoundId(toneId);
    await previewTone(toneId);
  };

  const save = async () => {
    await stopPreview();

    if (days.length === 0) {
      setDays([0, 1, 2, 3, 4, 5, 6]);
      return;
    }
    const current = await loadAlarms();
    let updated: Alarm[];
    let savedAlarm: Alarm;
    if (existing) {
      const upd = { ...existing, label, hour, minute, days, soundId };
      updated = current.map((a) => a.id === existing.id ? upd : a);
      savedAlarm = upd;
    } else {
      const newAlarm: Alarm = {
        id: Date.now().toString(),
        label: label || "Sveglia",
        hour,
        minute,
        days,
        enabled: true,
        createdAt: Date.now(),
        soundId,
      };
      updated = [...current, newAlarm];
      savedAlarm = newAlarm;
    }
    await saveAlarms(updated);
    await scheduleAlarm(savedAlarm);
    navigation.goBack();
  };

  const selectedTone = getToneById(soundId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={async () => {
              await stopPreview();
              navigation.goBack();
            }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {existing ? "Modifica" : "Nuova sveglia"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Time picker */}
        <View style={styles.timeCard}>
          <TimeWheel value={hour} max={24} onChange={setHour} />
          <Text style={styles.colon}>:</Text>
          <TimeWheel value={minute} max={60} onChange={setMinute} />
        </View>

        {/* Label */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nome sveglia</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="es. Lavoro, Palestra, Weekend…"
            placeholderTextColor={colors.textDim}
            returnKeyType="done"
          />
        </View>

        {/* Days */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Giorni</Text>
          <View style={styles.daysRow}>
            {DAY_LABELS.map((d, i) => {
              const active = days.includes(i as Weekday);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayBtn, active && styles.dayBtnActive]}
                  onPress={() => toggleDay(i as Weekday)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {days.length === 0 && (
            <Text style={styles.dayWarning}>Seleziona almeno un giorno</Text>
          )}
        </View>

        {/* Ringtone picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Suoneria</Text>
          <View style={styles.tonesCard}>
            {ALARM_TONES.map((tone) => {
              const isSelected = soundId === tone.id;
              const isPreviewing = previewingId === tone.id;
              return (
                <TouchableOpacity
                  key={tone.id}
                  style={[
                    styles.toneRow,
                    isSelected && styles.toneRowSelected,
                  ]}
                  onPress={() => selectTone(tone.id)}
                  activeOpacity={0.75}
                >
                  {/* Icona tono */}
                  <View
                    style={[
                      styles.toneIconWrap,
                      isSelected && styles.toneIconWrapSelected,
                    ]}
                  >
                    <Ionicons
                      name={tone.icon as any}
                      size={20}
                      color={isSelected ? colors.white : colors.textSub}
                    />
                  </View>

                  {/* Nome */}
                  <Text
                    style={[
                      styles.toneName,
                      isSelected && styles.toneNameSelected,
                    ]}
                  >
                    {tone.label}
                  </Text>

                  {/* Indicatore riproduzione / selezione */}
                  <View style={styles.toneRight}>
                    {isPreviewing && (
                      <View style={styles.playingBadge}>
                        <Ionicons
                          name="volume-high"
                          size={14}
                          color={colors.accent}
                        />
                      </View>
                    )}
                    {isSelected && !isPreviewing && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.accent}
                      />
                    )}
                    {!isSelected && (
                      <View style={styles.toneRadioEmpty} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.toneHint}>
            Tocca un suono per sentirne l'anteprima (6 sec)
          </Text>
        </View>

        {/* Challenge info */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeIcon}>
            <Ionicons name="camera" size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>Sfida foto attiva</Text>
            <Text style={styles.challengeSub}>
              Per spegnere la sveglia dovrai fotografare un oggetto casuale di casa
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={22} color={colors.white} />
          <Text style={styles.saveBtnText}>Salva sveglia</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.text,
  },
  timeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colon: {
    fontSize: 56,
    fontWeight: "300",
    color: colors.textSub,
    lineHeight: 72,
    marginBottom: 4,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: font.sm,
    fontWeight: "600",
    color: colors.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daysRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  dayBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 52,
    alignItems: "center",
  },
  dayBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayBtnText: {
    fontSize: font.sm,
    fontWeight: "600",
    color: colors.textSub,
  },
  dayBtnTextActive: {
    color: colors.white,
  },
  dayWarning: {
    fontSize: font.sm,
    color: colors.red,
    marginTop: 4,
  },
  // Ringtone picker
  tonesCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  toneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toneRowSelected: {
    backgroundColor: colors.accentSoft,
  },
  toneIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  toneIconWrapSelected: {
    backgroundColor: colors.accent,
  },
  toneName: {
    flex: 1,
    fontSize: font.md,
    color: colors.text,
    fontWeight: "500",
  },
  toneNameSelected: {
    fontWeight: "700",
    color: colors.accent,
  },
  toneRight: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  toneRadioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  playingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  toneHint: {
    fontSize: font.xs,
    color: colors.textDim,
    textAlign: "center",
    marginTop: 2,
  },
  // Challenge card
  challengeCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + "44",
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  challengeTitle: {
    fontSize: font.md,
    fontWeight: "700",
    color: colors.accent,
  },
  challengeSub: {
    fontSize: font.sm,
    color: colors.textSub,
    marginTop: 2,
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  saveBtnText: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.white,
  },
});
