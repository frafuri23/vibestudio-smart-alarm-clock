import { Alarm } from "./types";

export type RootStackParamList = {
  Home: undefined;
  EditAlarm: { alarm: Alarm | null };
  AlarmRinging: { alarm: Alarm };
  Challenge: { alarm: Alarm };
  Settings: undefined;
};
