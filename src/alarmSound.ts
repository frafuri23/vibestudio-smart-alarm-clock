/**
 * alarmSound.ts
 * Gestisce la suoneria della sveglia tramite expo-av.
 *
 * Sul dispositivo fisico:
 * - Se soundId corrisponde al tono "classic" (o non specificato), prova prima
 *   il file bundlato assets/sounds/alarm.wav, poi fallback CDN
 * - Per gli altri toni usa direttamente la URI CDN del tono selezionato
 * - playsInSilentModeIOS: true → suona anche con la suoneria silenziata
 * - staysActiveInBackground: true → continua in background
 * - interruptionModeIOS: DO_NOT_MIX → prende il controllo audio completo
 * - Loop infinito finché stopAlarmSound() non viene chiamato
 *
 * Sul web (preview):
 * - expo-av non produce audio — limite del runtime browser
 * - Le funzioni sono no-op silenziose
 */

import { Platform } from "react-native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { getToneById, DEFAULT_TONE_ID } from "./alarmTones";

let soundObject: Audio.Sound | null = null;
let isPlaying = false;

// Fallback CDN per il tono classico quando alarm.wav non è bundlato
const CLASSIC_FALLBACK_URI =
  "https://cdn.freesound.org/previews/233/233644_2371344-lq.mp3";

async function setAlarmAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    shouldDuckAndroid: false,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    playThroughEarpieceAndroid: false,
  });
}

/**
 * Avvia la suoneria in loop.
 * @param soundId  id del tono (da Alarm.soundId). Default: "classic"
 */
export async function startAlarmSound(soundId?: string): Promise<void> {
  if (Platform.OS === "web") return;
  if (isPlaying) return;

  try {
    await stopAlarmSound();
    await setAlarmAudioMode();

    const toneId = soundId ?? DEFAULT_TONE_ID;
    const tone = getToneById(toneId);

    let sound: Audio.Sound | null = null;

    if (tone.uri === null) {
      // Tono "classic": prova prima il file bundlato, poi CDN
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const localSource = require("../assets/sounds/alarm.wav");
        const result = await Audio.Sound.createAsync(localSource, {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
          isMuted: false,
        });
        sound = result.sound;
      } catch {
        // File bundlato non presente — usa CDN
        const result = await Audio.Sound.createAsync(
          { uri: CLASSIC_FALLBACK_URI },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        sound = result.sound;
      }
    } else {
      // Tono da CDN
      try {
        const result = await Audio.Sound.createAsync(
          { uri: tone.uri },
          { shouldPlay: true, isLooping: true, volume: 1.0, isMuted: false }
        );
        sound = result.sound;
      } catch {
        // Fallback classico se il CDN del tono non risponde
        const result = await Audio.Sound.createAsync(
          { uri: CLASSIC_FALLBACK_URI },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        sound = result.sound;
      }
    }

    if (!sound) return;

    soundObject = sound;
    isPlaying = true;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        isPlaying = false;
        soundObject = null;
      }
    });
  } catch (e) {
    isPlaying = false;
    console.warn("[AlarmSound] startAlarmSound error:", e);
  }
}

/**
 * Ferma e scarica il suono corrente.
 */
export async function stopAlarmSound(): Promise<void> {
  if (Platform.OS === "web") return;
  isPlaying = false;
  try {
    if (soundObject) {
      const status = await soundObject.getStatusAsync();
      if (status.isLoaded) {
        await soundObject.stopAsync();
        await soundObject.unloadAsync();
      }
      soundObject = null;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    soundObject = null;
    console.warn("[AlarmSound] stopAlarmSound error:", e);
  }
}

export function isAlarmSoundPlaying(): boolean {
  return isPlaying;
}
