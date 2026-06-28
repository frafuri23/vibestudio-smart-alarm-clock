/**
 * Gestione abbonamento con RevenueCat.
 * Sul web (preview) tutte le funzioni sono no-op / simulazione.
 */
import { Platform } from "react-native";

// ID entitlement configurato su RevenueCat dashboard
export const ENTITLEMENT_ID = "premium";

// ─── Tipi ────────────────────────────────────────────────────────────────────
export interface SubscriptionStatus {
  isActive: boolean;       // entitlement attivo
  isTrialing: boolean;     // in periodo di prova
  expiresAt?: Date;        // scadenza corrente (se nota)
}

// ─── Init ────────────────────────────────────────────────────────────────────
export async function initRevenueCat(): Promise<void> {
  if (Platform.OS === "web") return;
  const apiKey = process.env.REVENUECAT_API_KEY;
  if (!apiKey) {
    console.warn("[RevenueCat] REVENUECAT_API_KEY non configurata");
    return;
  }
  try {
    const Purchases = require("react-native-purchases").default;
    Purchases.configure({ apiKey });
  } catch (e) {
    console.warn("[RevenueCat] configure error:", e);
  }
}

// ─── Stato abbonamento ───────────────────────────────────────────────────────
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (Platform.OS === "web") {
    // Nel preview mostriamo sempre il paywall (simulazione)
    return { isActive: false, isTrialing: false };
  }
  try {
    const Purchases = require("react-native-purchases").default;
    const info = await Purchases.getCustomerInfo();
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    if (!entitlement) return { isActive: false, isTrialing: false };
    return {
      isActive: true,
      isTrialing: entitlement.periodType === "TRIAL",
      expiresAt: entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : undefined,
    };
  } catch (e) {
    console.warn("[RevenueCat] getSubscriptionStatus error:", e);
    return { isActive: false, isTrialing: false };
  }
}

// ─── Listener aggiornamento ───────────────────────────────────────────────────
export function addSubscriptionListener(
  callback: (status: SubscriptionStatus) => void
): (() => void) {
  if (Platform.OS === "web") return () => {};
  try {
    const Purchases = require("react-native-purchases").default;
    const listener = Purchases.addCustomerInfoUpdateListener(async (info: any) => {
      const entitlement = info.entitlements.active[ENTITLEMENT_ID];
      if (!entitlement) {
        callback({ isActive: false, isTrialing: false });
      } else {
        callback({
          isActive: true,
          isTrialing: entitlement.periodType === "TRIAL",
          expiresAt: entitlement.expirationDate
            ? new Date(entitlement.expirationDate)
            : undefined,
        });
      }
    });
    return () => listener.remove();
  } catch {
    return () => {};
  }
}

// ─── Acquisto ────────────────────────────────────────────────────────────────
export interface OfferingPackage {
  identifier: string;
  productTitle: string;
  priceString: string;
  description: string;
  packageType: string;
  raw: any;
}

export async function getOfferings(): Promise<OfferingPackage[]> {
  if (Platform.OS === "web") {
    // Mock per il preview
    return [
      {
        identifier: "monthly_mock",
        productTitle: "Sveglia Pro",
        priceString: "€4,99/mese",
        description: "Accesso completo. 7 giorni gratis, poi €4,99/mese.",
        packageType: "MONTHLY",
        raw: null,
      },
    ];
  }
  try {
    const Purchases = require("react-native-purchases").default;
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) return [];
    return offerings.current.availablePackages.map((pkg: any) => ({
      identifier: pkg.identifier,
      productTitle: pkg.product.title,
      priceString: pkg.product.priceString,
      description: pkg.product.description,
      packageType: pkg.packageType,
      raw: pkg,
    }));
  } catch (e) {
    console.warn("[RevenueCat] getOfferings error:", e);
    return [];
  }
}

export async function purchasePackage(pkg: OfferingPackage): Promise<boolean> {
  if (Platform.OS === "web") {
    // Nel preview simula un acquisto riuscito
    return true;
  }
  if (!pkg.raw) return false;
  try {
    const Purchases = require("react-native-purchases").default;
    const { customerInfo } = await Purchases.purchasePackage(pkg.raw);
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (e: any) {
    const Purchases = require("react-native-purchases").default;
    if (e.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return false; // utente ha annullato — non è un errore
    }
    throw e;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Purchases = require("react-native-purchases").default;
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch (e) {
    console.warn("[RevenueCat] restorePurchases error:", e);
    return false;
  }
}
