/**
 * SettingsScreen — gestione piano, abbonamento e info app.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, radius, font } from "../theme";
import { RootStackParamList } from "../navigation";
import {
  getSubscriptionStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  OfferingPackage,
  SubscriptionStatus,
} from "../subscription";

type Nav = NativeStackNavigationProp<RootStackParamList, "Settings">;

// ─── Componente riga impostazione ─────────────────────────────────────────────
function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
  chevron = true,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIconWrap, danger && styles.rowIconWrapDanger]}>
        <Ionicons
          name={icon as any}
          size={18}
          color={danger ? colors.red : colors.accent}
        />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {chevron && onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Badge stato abbonamento ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: SubscriptionStatus | null }) {
  if (!status) return null;
  if (status.isActive && status.isTrialing) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.greenSoft }]}>
        <Ionicons name="timer-outline" size={13} color={colors.green} />
        <Text style={[styles.badgeText, { color: colors.green }]}>Prova gratuita</Text>
      </View>
    );
  }
  if (status.isActive) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.greenSoft }]}>
        <Ionicons name="checkmark-circle" size={13} color={colors.green} />
        <Text style={[styles.badgeText, { color: colors.green }]}>Attivo</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors.redSoft }]}>
      <Ionicons name="close-circle" size={13} color={colors.red} />
      <Text style={[styles.badgeText, { color: colors.red }]}>Non attivo</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [packages, setPackages] = useState<OfferingPackage[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingStatus(true);
      const [s, pkgs] = await Promise.all([getSubscriptionStatus(), getOfferings()]);
      setStatus(s);
      setPackages(pkgs);
      setLoadingStatus(false);
    })();
  }, []);

  const handleSubscribe = async () => {
    if (packages.length === 0) return;
    setPurchasing(true);
    try {
      const success = await purchasePackage(packages[0]);
      if (success) {
        const s = await getSubscriptionStatus();
        setStatus(s);
        Alert.alert("Abbonamento attivato", "Benvenuto in Sveglia Pro!");
      }
    } catch (e: any) {
      Alert.alert("Errore acquisto", e?.message || "Si è verificato un errore.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        const s = await getSubscriptionStatus();
        setStatus(s);
        Alert.alert("Acquisto ripristinato", "Il tuo abbonamento è attivo.");
      } else {
        Alert.alert(
          "Nessun acquisto trovato",
          "Non abbiamo trovato un abbonamento attivo per questo account."
        );
      }
    } catch {
      Alert.alert("Errore", "Impossibile ripristinare gli acquisti.");
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
    }
  };

  const monthlyPkg = packages[0];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sezione piano ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Il tuo piano</Text>
        <View style={styles.planCard}>
          {loadingStatus ? (
            <ActivityIndicator color={colors.accent} style={{ padding: spacing.lg }} />
          ) : (
            <>
              <View style={styles.planTop}>
                <View style={styles.planIconWrap}>
                  <Ionicons name="alarm" size={28} color={colors.accent} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Sveglia Pro</Text>
                  <StatusBadge status={status} />
                </View>
              </View>

              {status?.expiresAt && (
                <View style={styles.expiryRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textDim} />
                  <Text style={styles.expiryText}>
                    {status.isTrialing ? "Prova gratuita fino al " : "Rinnovo il "}
                    {status.expiresAt.toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              )}

              {/* Prezzo mensile */}
              {monthlyPkg && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>{monthlyPkg.priceString}</Text>
                  <Text style={styles.pricePeriod}> / mese dopo la prova</Text>
                </View>
              )}

              {/* CTA in base allo stato */}
              {!status?.isActive ? (
                <TouchableOpacity
                  style={[styles.ctaBtn, purchasing && { opacity: 0.6 }]}
                  onPress={handleSubscribe}
                  disabled={purchasing || packages.length === 0}
                  activeOpacity={0.85}
                >
                  {purchasing ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.ctaBtnText}>
                      Inizia 7 giorni gratis
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.manageBtn}
                  onPress={handleManageSubscription}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={15} color={colors.accent} />
                  <Text style={styles.manageBtnText}>Gestisci abbonamento</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* ── Cosa include ──────────────────────────────────────────────── */}
        {(!status?.isActive) && (
          <>
            <Text style={styles.sectionTitle}>Cosa include</Text>
            <View style={styles.featuresCard}>
              {[
                { icon: "alarm", label: "Sveglie illimitate" },
                { icon: "camera", label: "Sfida foto per spegnersi" },
                { icon: "musical-notes", label: "Suonerie personalizzate" },
                { icon: "notifications", label: "Notifiche critiche anche in DND" },
                { icon: "shield-checkmark", label: "Nessuna pubblicità" },
              ].map((f) => (
                <View key={f.label} style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon as any} size={16} color={colors.accent} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Ionicons name="checkmark" size={16} color={colors.green} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Supporto ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Supporto</Text>
        <View style={styles.section}>
          <SettingRow
            icon="refresh-circle-outline"
            label="Ripristina acquisti"
            onPress={restoring ? undefined : handleRestore}
            chevron={!restoring}
          />
          {restoring && (
            <ActivityIndicator
              color={colors.accent}
              size="small"
              style={{ paddingVertical: spacing.sm }}
            />
          )}
          <View style={styles.divider} />
          <SettingRow
            icon="mail-outline"
            label="Contatta il supporto"
            onPress={() => Linking.openURL("mailto:support@svegliaintelligente.app")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() =>
              Linking.openURL("https://svegliaintelligente.app/privacy")
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="newspaper-outline"
            label="Termini di servizio"
            onPress={() =>
              Linking.openURL("https://svegliaintelligente.app/terms")
            }
          />
        </View>

        {/* ── Nota legale ───────────────────────────────────────────────── */}
        <Text style={styles.legalNote}>
          L'abbonamento si rinnova automaticamente ogni mese. Puoi annullare in
          qualsiasi momento dalle impostazioni del tuo account App Store almeno
          24 ore prima del rinnovo.
        </Text>

        <Text style={styles.version}>Sveglia Intelligente · v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: font.sm,
    fontWeight: "700",
    color: colors.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  planCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  planTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  planInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  planName: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.text,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: font.xs,
    fontWeight: "700",
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  expiryText: {
    fontSize: font.sm,
    color: colors.textDim,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceAmount: {
    fontSize: font.xl,
    fontWeight: "800",
    color: colors.text,
  },
  pricePeriod: {
    fontSize: font.sm,
    color: colors.textSub,
  },
  ctaBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnText: {
    fontSize: font.md,
    fontWeight: "800",
    color: colors.white,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.full,
  },
  manageBtnText: {
    fontSize: font.sm,
    fontWeight: "700",
    color: colors.accent,
  },
  featuresCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 2,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    flex: 1,
    fontSize: font.sm,
    color: colors.text,
    fontWeight: "500",
  },
  section: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconWrapDanger: {
    backgroundColor: colors.redSoft,
  },
  rowLabel: {
    flex: 1,
    fontSize: font.md,
    color: colors.text,
    fontWeight: "500",
  },
  rowLabelDanger: {
    color: colors.red,
  },
  rowValue: {
    fontSize: font.sm,
    color: colors.textDim,
    marginRight: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 34 + spacing.md,
  },
  legalNote: {
    fontSize: font.xs,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 17,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  version: {
    fontSize: font.xs,
    color: colors.textDim,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
