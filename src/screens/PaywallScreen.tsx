/**
 * PaywallScreen — mostrato agli utenti senza abbonamento attivo.
 * Offerta: 7 giorni gratis poi €4,99/mese.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "../theme";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  OfferingPackage,
} from "../subscription";

interface Props {
  onSubscribed: () => void;
  onSkip?: () => void;
}

const FEATURES = [
  { icon: "alarm", label: "Sveglie illimitate" },
  { icon: "camera", label: "Sfida foto per spegnersi" },
  { icon: "musical-notes", label: "Suonerie personalizzate" },
  { icon: "notifications", label: "Notifiche critiche anche in DND" },
  { icon: "shield-checkmark", label: "Nessuna pubblicità" },
];

export default function PaywallScreen({ onSubscribed, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<OfferingPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getOfferings().then((pkgs) => {
      setPackages(pkgs);
      if (pkgs.length > 0) setSelected(pkgs[0].identifier);
      setLoading(false);
    });
  }, []);

  const selectedPkg = packages.find((p) => p.identifier === selected);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPkg);
      if (success) {
        onSubscribed();
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
        Alert.alert("Acquisto ripristinato", "Il tuo abbonamento è attivo.", [
          { text: "OK", onPress: onSubscribed },
        ]);
      } else {
        Alert.alert(
          "Nessun acquisto",
          "Non abbiamo trovato un abbonamento attivo per questo account."
        );
      }
    } catch {
      Alert.alert("Errore", "Impossibile ripristinare gli acquisti.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.heroSection}>
          <View style={styles.iconRing}>
            <Ionicons name="alarm" size={48} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Sveglia Pro</Text>
          <Text style={styles.heroSub}>
            La sveglia intelligente che non riesci ad ignorare
          </Text>
        </View>

        {/* Badge trial */}
        <View style={styles.trialBadge}>
          <Ionicons name="gift-outline" size={16} color={colors.accent} />
          <Text style={styles.trialBadgeText}>7 giorni GRATIS, poi annulla quando vuoi</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon as any} size={18} color={colors.accent} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Packages */}
        {loading ? (
          <ActivityIndicator
            color={colors.accent}
            size="large"
            style={{ marginVertical: spacing.xl }}
          />
        ) : (
          <View style={styles.packagesSection}>
            {packages.map((pkg) => {
              const isSelected = selected === pkg.identifier;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.packageCard,
                    isSelected && styles.packageCardSelected,
                  ]}
                  onPress={() => setSelected(pkg.identifier)}
                  activeOpacity={0.8}
                >
                  <View style={styles.packageLeft}>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.packageTitle}>{pkg.productTitle}</Text>
                      <Text style={styles.packageDesc} numberOfLines={2}>
                        {pkg.description || "Accesso completo all'app"}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.packagePrice,
                      isSelected && styles.packagePriceSelected,
                    ]}
                  >
                    {pkg.priceString}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Note legali */}
        <Text style={styles.legalNote}>
          L'abbonamento si rinnova automaticamente. Puoi annullare in qualsiasi
          momento dalle impostazioni del tuo account App Store.
        </Text>

        {/* Ripristina acquisti */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreBtn}
        >
          {restoring ? (
            <ActivityIndicator color={colors.textDim} size="small" />
          ) : (
            <Text style={styles.restoreText}>Ripristina acquisti</Text>
          )}
        </TouchableOpacity>

        {/* Skip */}
        {onSkip && (
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Continua senza abbonamento</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* CTA fisso in basso */}
      <View
        style={[
          styles.ctaContainer,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <TouchableOpacity
          style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || loading || !selectedPkg}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.ctaBtnText}>Inizia 7 giorni gratis</Text>
              <Text style={styles.ctaBtnSub}>
                {selectedPkg ? `Poi ${selectedPkg.priceString}` : ""}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  heroSection: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: font.md,
    color: colors.textSub,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.accent + "40",
  },
  trialBadgeText: {
    fontSize: font.sm,
    fontWeight: "700",
    color: colors.accent,
  },
  featuresCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: font.md,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
  },
  packagesSection: {
    gap: spacing.sm,
  },
  packageCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  packageLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: colors.accent,
  },
  packageTitle: {
    fontSize: font.md,
    fontWeight: "700",
    color: colors.text,
  },
  packageDesc: {
    fontSize: font.sm,
    color: colors.textSub,
    maxWidth: 200,
    lineHeight: 18,
    marginTop: 2,
  },
  packagePrice: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.textSub,
    marginLeft: spacing.sm,
  },
  packagePriceSelected: {
    color: colors.accent,
  },
  legalNote: {
    fontSize: font.xs,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 17,
  },
  restoreBtn: {
    alignSelf: "center",
    padding: spacing.sm,
  },
  restoreText: {
    fontSize: font.sm,
    color: colors.textDim,
    textDecorationLine: "underline",
  },
  ctaContainer: {
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
  ctaBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    gap: 2,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaBtnText: {
    fontSize: font.lg,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.3,
  },
  ctaBtnSub: {
    fontSize: font.sm,
    color: colors.white + "cc",
    fontWeight: "500",
  },
  skipBtn: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  skipText: {
    fontSize: font.sm,
    color: colors.textDim,
    textDecorationLine: "underline",
  },
});
