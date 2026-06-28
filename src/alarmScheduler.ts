/**
 * alarmScheduler.ts
 * Schedula e cancella notifiche locali per ogni sveglia attiva.
 *
 * STRATEGIA AUDIO PERSISTENTE:
 * - iOS: usa sound "alarm.wav" bundlato (fino a 30s, loop automatico del sistema)
 * - Android: canale "alarm_channel" con AudioAttributes.usage = ALARM,
 *   che bypassa la modalità silenziosa e il Do Not Disturb
 * - Persistenza: schedula N notifiche ravvicinate (ogni minuto per 5 minuti)
 *   così la sveglia continua a suonare anche se l'utente ignora la prima.
 *   Quando l'utente completa la sfida, tutte vengono cancellate.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Alarm, Weekday } from "./types";

// ID canale Android ad alta priorità per sveglie
const ALARM_CHANNEL_ID = "alarm_channel";
// Quante notifiche ravvicinate schedulare per la persistenza (ogni 1 min)
const PERSISTENCE_COUNT = 5;

// Configura il comportamento della notifica quando l'app è in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Crea (o aggiorna) il canale Android per le sveglie.
 * importance MAX + audioAttributes ALARM bypassa la modalità silenziosa.
 */
export async function setupAndroidAlarmChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: "Sveglie",
    description: "Notifiche sveglia — suonano anche in modalità silenziosa",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",                      // suono default sistema
    vibrationPattern: [0, 500, 300, 500, 300, 500],
    enableLights: true,
    lightColor: "#ff6b35",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,                       // bypassa Do Not Disturb
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,           // ignora il volume di sistema se a zero
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });
}

// Chiede i permessi all'utente (richiesto da iOS)
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  // Setup canale Android prima di chiedere i permessi
  await setupAndroidAlarmChannel();

  // Registra la categoria iOS con azione di dismissal rapido
  if (Platform.OS === "ios") {
    await Notifications.setNotificationCategoryAsync("ALARM_CATEGORY", [
      {
        identifier: "DISMISS_ACTION",
        buttonTitle: "Apri sveglia",
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      allowCriticalAlerts: false,  // critical-alerts richiede approvazione Apple speciale
    },
  });
  return status === "granted";
}

// Converte il weekday interno (0=Lun) nel formato expo-notifications
// expo-notifications: 1=Domenica, 2=Lunedì … 7=Sabato
function toExpoWeekday(day: Weekday): number {
  return day === 6 ? 1 : day + 2;
}

// Identificatore base per una sveglia + giorno
function notifBaseId(alarmId: string, day: Weekday): string {
  return `alarm_${alarmId}_day${day}`;
}

// Identificatore per una specifica notifica di persistenza (0 = principale)
function notifPersistId(alarmId: string, day: Weekday, index: number): string {
  return `${notifBaseId(alarmId, day)}_p${index}`;
}

// Schedula tutte le notifiche settimanali per una singola sveglia
export async function scheduleAlarm(alarm: Alarm): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelAlarm(alarm.id);

  if (!alarm.enabled || alarm.days.length === 0) return;

  for (const day of alarm.days) {
    // Notifica principale — orario esatto della sveglia
    await Notifications.scheduleNotificationAsync({
      identifier: notifPersistId(alarm.id, day, 0),
      content: buildNotifContent(alarm, false),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(day),
        hour: alarm.hour,
        minute: alarm.minute,
        second: 0,
      },
    });

    // Notifiche di persistenza: +1, +2, +3, +4 minuti dopo
    // Se l'utente non risponde alla prima, continua a suonare
    for (let i = 1; i < PERSISTENCE_COUNT; i++) {
      const extraMinute = alarm.minute + i;
      const extraHour = alarm.hour + Math.floor(extraMinute / 60);
      const adjustedMinute = extraMinute % 60;
      const adjustedHour = extraHour % 24;

      await Notifications.scheduleNotificationAsync({
        identifier: notifPersistId(alarm.id, day, i),
        content: buildNotifContent(alarm, true),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(day),
          hour: adjustedHour,
          minute: adjustedMinute,
          second: 0,
        },
      });
    }
  }
}

function buildNotifContent(
  alarm: Alarm,
  isRepeat: boolean
): Notifications.NotificationContentInput {
  const label = alarm.label || "Sveglia";
  return {
    title: isRepeat ? `${label} — ANCORA IN CORSO` : `${label}`,
    subtitle: isRepeat ? "La sveglia sta ancora suonando!" : "Sveglia attiva",
    body: "Tocca per disattivare — dovrai fotografare un oggetto!",
    // iOS: suono di default sistema
    sound: "default",
    // iOS: interruptionLevel "timeSensitive" → passa il Focus ma non richiede entitlement speciale
    ...(Platform.OS === "ios"
      ? {
          interruptionLevel: "timeSensitive",
          categoryIdentifier: "ALARM_CATEGORY",
        }
      : {}),
    data: { alarmId: alarm.id, isRepeat },
    // Android: instrada sul canale alarm
    ...(Platform.OS === "android"
      ? {
          channelId: ALARM_CHANNEL_ID,
          // Mostra la notifica sulla lockscreen in full-screen (come Clock)
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
        }
      : {}),
  } as Notifications.NotificationContentInput;
}

// Cancella TUTTE le notifiche (principale + persistenza) per una sveglia
export async function cancelAlarm(alarmId: string): Promise<void> {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled
    .filter((n) => n.identifier.startsWith(`alarm_${alarmId}_`))
    .map((n) => n.identifier);
  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  // Rimuove anche eventuali notifiche già consegnate nel notification center
  await Notifications.dismissAllNotificationsAsync();
}

// Rischedula tutte le sveglie (chiamato all'avvio per sincronizzare)
export async function syncAllAlarms(alarms: Alarm[]): Promise<void> {
  if (Platform.OS === "web") return;
  await setupAndroidAlarmChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const alarm of alarms) {
    if (alarm.enabled && alarm.days.length > 0) {
      await scheduleAlarm(alarm);
    }
  }
}
