/**
 * alarmTones.ts
 * Catalogo dei suoni disponibili per la sveglia.
 *
 * Ogni tono ha:
 * - id: identificatore univoco persistito su Alarm.soundId
 * - label: nome mostrato all'utente
 * - uri: URL CDN pubblico (CC0) oppure null per il file bundlato
 * - icon: nome Ionicons
 *
 * Il file bundlato assets/sounds/alarm.wav ha precedenza su tutto.
 * Se non è presente, si usa il CDN.
 */

export interface AlarmTone {
  id: string;
  label: string;
  uri: string | null; // null = file bundlato assets/sounds/alarm.wav
  icon: string;
}

export const ALARM_TONES: AlarmTone[] = [
  {
    id: "classic",
    label: "Classica",
    uri: null, // usa alarm.wav bundlato, con fallback CDN
    icon: "alarm-outline",
  },
  {
    id: "digital",
    label: "Digitale",
    uri: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3",
    icon: "pulse-outline",
  },
  {
    id: "gentle",
    label: "Dolce",
    uri: "https://cdn.freesound.org/previews/457/457518_9159115-lq.mp3",
    icon: "sunny-outline",
  },
  {
    id: "urgent",
    label: "Urgente",
    uri: "https://cdn.freesound.org/previews/233/233644_2371344-lq.mp3",
    icon: "flash-outline",
  },
  {
    id: "bell",
    label: "Campanello",
    uri: "https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3",
    icon: "notifications-outline",
  },
];

export const DEFAULT_TONE_ID = "classic";

export function getToneById(id: string | undefined): AlarmTone {
  return ALARM_TONES.find((t) => t.id === id) ?? ALARM_TONES[0];
}
