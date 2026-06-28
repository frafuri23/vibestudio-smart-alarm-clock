export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Lun, 6 = Dom

export interface Alarm {
  id: string;
  label: string;
  hour: number;
  minute: number;
  days: Weekday[]; // giorni selezionati
  enabled: boolean;
  createdAt: number;
  soundId?: string; // id del tono dalla lista ALARM_TONES (default: "classic")
}
