# Suono sveglia

Il file `alarm.wav` deve essere presente in questa cartella prima del build.

## Come ottenere il file

Scarica un file WAV di suoneria sveglia (max 30 secondi, 44100 Hz stereo) e salvalo come `alarm.wav` in questa cartella.

Fonti gratuite:
- https://freesound.org/sounds/559143/ (alarm clock)
- https://freesound.org/sounds/321967/ (digital alarm)

Oppure usa qualsiasi file .wav rinominato come `alarm.wav`.

Il file è referenziato in:
- `app.json` → `expo-notifications.sounds`
- `src/alarmSound.ts` → `require("../../assets/sounds/alarm.wav")`
- `src/alarmScheduler.ts` → `sound: "alarm.wav"` nelle notifiche
