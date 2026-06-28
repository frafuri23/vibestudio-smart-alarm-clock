import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alarm } from "./types";

const KEY = "smart_alarms_v1";
const SKIP_PAYWALL_KEY = "skip_paywall_v1";

export async function getSkippedPaywall(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(SKIP_PAYWALL_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setSkippedPaywall(): Promise<void> {
  try {
    await AsyncStorage.setItem(SKIP_PAYWALL_KEY, "true");
  } catch {}
}

export async function loadAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Alarm[];
  } catch {
    return [];
  }
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(alarms));
  } catch {}
}
