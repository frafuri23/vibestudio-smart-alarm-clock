import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { colors, spacing, radius, font } from "../theme";
import { getRandomObject } from "../objects";
import { RootStackParamList } from "../navigation";
import { stopAlarmSound } from "../alarmSound";

type Nav = NativeStackNavigationProp<RootStackParamList, "Challenge">;
type Route = RouteProp<RootStackParamList, "Challenge">;

type State = "waiting" | "taken" | "analyzing" | "success" | "fail";

export default function ChallengeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const alarm = route.params.alarm;

  const [target] = useState(() => getRandomObject());
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [state, setState] = useState<State>("waiting");
  const [failMsg, setFailMsg] = useState("");
  const [attempts, setAttempts] = useState(0);
  const targetRef = useRef(target);

  const takePhoto = async () => {
    try {
      // Richiedi permesso fotocamera prima di aprirla
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permesso fotocamera",
          "Per completare la sfida devi consentire l'accesso alla fotocamera. Abilitalo nelle impostazioni del dispositivo.",
          [{ text: "OK" }]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      setState("taken");
      await analyzePhoto(asset.base64 ?? "");
    } catch (e) {
      Alert.alert("Errore fotocamera", "Non è stato possibile aprire la fotocamera.");
    }
  };

  const analyzePhoto = async (base64: string) => {
    setState("analyzing");

    const vibestudio = (Constants.expoConfig?.extra as any)?.vibestudio as
      | { proxy: string; key: string; provider?: string }
      | undefined;

    // Fallback simulato se la chiave AI non è ancora configurata
    if (!vibestudio?.key || !vibestudio?.provider) {
      await new Promise((r) => setTimeout(r, 1500));
      const lucky = Math.random() > 0.4;
      if (lucky) {
        await stopAlarmSound();
        setState("success");
      } else {
        setAttempts((a) => a + 1);
        setFailMsg("Non riesco a vedere l'oggetto richiesto. Riprova!");
        setState("fail");
      }
      return;
    }

    try {
      // Usa il proxy VibeStudio normalizzato: POST /ai con messages che include l'immagine base64
      const response = await fetch(vibestudio.proxy + "/ai", {
        method: "POST",
        headers: {
          "x-vibestudio-app-key": vibestudio.key,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
                {
                  type: "text",
                  text: `Guarda questa foto. L'utente deve fotografare: "${targetRef.current.name}" (suggerimento: ${targetRef.current.hint}).
Nella foto è visibile questo oggetto? Rispondi SOLO con un JSON valido: {"found": true, "reason": "spiegazione breve in italiano"} oppure {"found": false, "reason": "spiegazione breve in italiano"}.
Sii permissivo: se l'oggetto è visibile anche parzialmente, considera found: true.`,
                },
              ],
            },
          ],
          json: true,
          maxTokens: 256,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error((errBody as any).error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      // data.json è già parsato dal proxy quando json:true
      const parsed = data.json as { found: boolean; reason: string } | null;

      if (!parsed) throw new Error(data.jsonError ?? "Risposta non valida");

      if (parsed.found === true) {
        await stopAlarmSound();
        setState("success");
      } else {
        setAttempts((a) => a + 1);
        setFailMsg(parsed.reason ?? "Oggetto non trovato nella foto.");
        setState("fail");
      }
    } catch (err: any) {
      setAttempts((a) => a + 1);
      setFailMsg(err?.message ?? "Errore di analisi. Riprova con un'altra foto.");
      setState("fail");
    }
  };

  const retry = () => {
    setPhotoUri(null);
    setState("waiting");
    setFailMsg("");
  };

  const dismiss = () => {
    // Reset dello stack: rimuove AlarmRinging e Challenge dalla history
    // così lo swipe back dalla Home non porta a schermate precedenti
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sfida foto</Text>
          {attempts > 0 && (
            <View style={styles.attemptsBadge}>
              <Text style={styles.attemptsText}>{attempts} tent.</Text>
            </View>
          )}
        </View>

        {/* Target object */}
        <View style={styles.targetCard}>
          <Text style={styles.targetPre}>Fotografa questo oggetto:</Text>
          <Text style={styles.targetName}>{targetRef.current.name}</Text>
          <View style={styles.hintRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSub} />
            <Text style={styles.hintText}>{targetRef.current.hint}</Text>
          </View>
        </View>

        {/* Photo area */}
        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            {state === "analyzing" && (
              <View style={styles.analyzeOverlay}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.analyzeText}>Analisi in corso…</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={56} color={colors.textDim} />
            <Text style={styles.photoPlaceholderText}>Scatta una foto all'oggetto</Text>
          </View>
        )}

        {/* Result states */}
        {state === "success" && (
          <View style={[styles.resultCard, styles.resultSuccess]}>
            <Ionicons name="checkmark-circle" size={40} color={colors.green} />
            <Text style={styles.resultTitle}>Corretto!</Text>
            <Text style={styles.resultSub}>
              Hai fotografato {targetRef.current.name}. Sveglia disattivata!
            </Text>
          </View>
        )}

        {state === "fail" && (
          <View style={[styles.resultCard, styles.resultFail]}>
            <Ionicons name="close-circle" size={40} color={colors.red} />
            <Text style={styles.resultTitle}>Oggetto non riconosciuto</Text>
            <Text style={styles.resultSub}>{failMsg}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {state === "success" ? (
          <TouchableOpacity style={styles.successBtn} onPress={dismiss} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={22} color={colors.white} />
            <Text style={styles.successBtnText}>Chiudi sveglia</Text>
          </TouchableOpacity>
        ) : state === "fail" ? (
          <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.85}>
            <Ionicons name="camera" size={22} color={colors.white} />
            <Text style={styles.retryBtnText}>Riprova</Text>
          </TouchableOpacity>
        ) : state === "analyzing" ? (
          <View style={styles.analyzingBtn}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.analyzingBtnText}>Analisi in corso…</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.85}>
            <Ionicons name="camera" size={26} color={colors.white} />
            <Text style={styles.photoBtnText}>
              {photoUri ? "Rifai la foto" : "Apri fotocamera"}
            </Text>
          </TouchableOpacity>
        )}
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
    paddingTop: spacing.md,
  },
  headerTitle: {
    fontSize: font.xxl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  attemptsBadge: {
    backgroundColor: colors.redSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  attemptsText: {
    fontSize: font.sm,
    fontWeight: "700",
    color: colors.red,
  },
  targetCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + "44",
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  targetPre: {
    fontSize: font.md,
    color: colors.textSub,
    fontWeight: "500",
  },
  targetName: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.accent,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  hintText: {
    fontSize: font.sm,
    color: colors.textSub,
  },
  photoContainer: {
    borderRadius: radius.xl,
    overflow: "hidden",
    height: 280,
    backgroundColor: colors.bgCardAlt,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  analyzeOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(245,245,247,0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  analyzeText: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.text,
  },
  photoPlaceholder: {
    height: 220,
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  photoPlaceholderText: {
    fontSize: font.md,
    color: colors.textDim,
  },
  resultCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green + "44",
  },
  resultFail: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red + "44",
  },
  resultTitle: {
    fontSize: font.xl,
    fontWeight: "800",
    color: colors.text,
  },
  resultSub: {
    fontSize: font.md,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  photoBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  photoBtnText: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.white,
  },
  retryBtn: {
    backgroundColor: colors.red,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  retryBtnText: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.white,
  },
  successBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  successBtnText: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.white,
  },
  analyzingBtn: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analyzingBtnText: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.textSub,
  },
});
