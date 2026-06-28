# Sveglia Intelligente — App Spec

## Scopo
App sveglia che per disattivarsi richiede di fotografare un oggetto casuale di casa, riconosciuto dall'IA (Claude di Anthropic).

## Schermate
- **Home** — lista sveglie con orario, giorni, nome tono, switch on/off, pulsante play preview suoneria, pulsante campanello per testare AlarmRinging, FAB "+"
- **EditAlarm** — crea o modifica sveglia: rotella orario, selezione giorni, campo nome, selettore suoneria con preview 6s per ogni tono
- **AlarmRinging** — sveglia attiva: orario grande, animazione pulsante pulsante, unico pulsante per avviare sfida; gestureEnabled: false
- **Challenge** — sfida foto: oggetto casuale richiesto, apertura fotocamera (con requestCameraPermissionsAsync), analisi via Claude API, feedback success/fail; gestureEnabled: false

## Navigazione
Stack nativo: Home → EditAlarm, Home → AlarmRinging → Challenge → Home (reset)

## Dati
- Sveglie salvate con AsyncStorage (chiave `smart_alarms_v1`)
- Tipo Alarm: id, label, hour, minute, days (Weekday[]), enabled, createdAt, soundId?
- Weekday: 0=Lun … 6=Dom

## Oggetti sfida
18 oggetti domestici in `src/objects.ts`, scelti casualmente. Ogni oggetto ha name + hint.

## Integrazione AI
- API Anthropic Claude (vision) per riconoscere l'oggetto nella foto
- Usa il proxy VibeStudio (`Constants.expoConfig.extra.vibestudio`) — NON chiama Anthropic direttamente
- Header: `x-vibestudio-app-key`, endpoint: `vibestudio.proxy + "/anthropic/messages"`
- Senza proxy: modalità fallback simulata per test nel preview
- Modello: claude-sonnet-4-6

## Notifiche / Sveglia nativa
- `expo-notifications` schedula notifiche settimanali ripetute per ogni sveglia + giorno
- Persistenza: 5 notifiche ravvicinate (+0,+1,+2,+3,+4 minuti) per ogni sveglia → continua a suonare se ignorata
- `src/alarmScheduler.ts` gestisce schedule/cancel/sync + setup canale Android ALARM
- Android: canale `alarm_channel` con `AndroidImportance.MAX`, `AudioAttributes.usage=ALARM`, `bypassDnd:true`
- iOS: `sound: "alarm.wav"` bundlato + `interruptionLevel: "critical"` + entitlement `critical-alerts`
- Suono custom: `assets/sounds/alarm.wav` (da aggiungere manualmente prima del build)
- Al tap sulla notifica (app in background/chiusa) → `navigation.reset` → AlarmRinging + avvia audio
- Notifica ricevuta in foreground → stessa navigazione automatica
- `cancelAlarm` cancella tutte le notifiche schedulate + dismissAll dal notification center
- Permessi iOS: NSCameraUsageDescription + UIBackgroundModes (audio, fetch) + critical-alerts entitlement
- Permessi Android: SCHEDULE_EXACT_ALARM / WAKE_LOCK / USE_FULL_SCREEN_INTENT / FOREGROUND_SERVICE
- Sul web le notifiche sono disabilitate (Platform.OS === "web" guard)
- Background task `ALARM_BACKGROUND_TASK` registrato con expo-task-manager (solo nativo, guard Platform.OS !== "web")
- `src/backgroundTask.native.ts` contiene la definizione del task; `src/backgroundTask.ts` è lo stub web vuoto

## Suonerie
- `src/alarmTones.ts` contiene il catalogo: Classica (file bundlato alarm.wav + fallback CDN), Digitale, Dolce, Urgente, Campanello
- `Alarm.soundId` persiste il tono scelto (default: "classic")
- `startAlarmSound(soundId?)` in `alarmSound.ts` carica il tono corretto
- `EditAlarmScreen` mostra selettore a lista con preview 6s per ogni tono
- `HomeScreen` mostra nome tono sulla card e passa `soundId` al preview
- `AlarmRingingScreen` passa `alarm.soundId` a `startAlarmSound`

## Abbonamento (RevenueCat)
- `react-native-purchases` configurato con `REVENUECAT_API_KEY` (Frontend env)
- Entitlement ID: `premium`
- Offerta: 7 giorni gratis + €4,99/mese (mensile rinnovabile)
- `src/subscription.ts` — init, getSubscriptionStatus, addSubscriptionListener, getOfferings, purchasePackage, restorePurchases
- `src/screens/PaywallScreen.tsx` — paywall completo con feature list, selector piano, CTA, ripristino acquisti
- Gate in `App.tsx`: se non abbonato mostra PaywallScreen; se abbonato mostra l'app
- Sul web: mock offering + acquisto simulato (per testare nel preview)
- Sul device reale: acquisto vero via App Store, trial 7gg configurato in App Store Connect + RevenueCat

## Tema
Chiaro: bg #f5f5f7, card bianca #ffffff, accent arancione #ff6b35, testo scuro #111118, verde successo #16a34a, rosso errore #dc2626
