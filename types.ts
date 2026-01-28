
export interface Reminder {
  id: string;
  time: string;
  title: string;
  type: 'med' | 'exercise' | 'water' | 'social';
  completed: boolean;
}

export interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export enum AppRoute {
  HOME = 'home',
  CHAT = 'chat',
  REMINDERS = 'reminders',
  VISION = 'vision',
  FAMILY = 'family',
  ALARM = 'alarm',
  SAFETY = 'safety',
  LIVE_CALL = 'live_call' // 新增即時視訊通話
}

export interface FamilyNote {
  id: string;
  sender: string;
  content: string;
  image?: string;
  time: string;
}

export interface SensorData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}
