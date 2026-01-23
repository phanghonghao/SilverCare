
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
  HEALTH = 'health',
  GUARDIAN = 'guardian',
  SAFETY = 'safety',
  ALARM = 'alarm'
}

export interface SensorData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}
