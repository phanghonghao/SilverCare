
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
  isHighPriority?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: string;
}

export enum AppRoute {
  HOME = 'home',
  CHAT = 'chat',
  REMINDERS = 'reminders',
  VISION = 'vision',
  FAMILY = 'family',
  ALARM = 'alarm',
  SAFETY = 'safety',
  LIVE_CALL = 'live_call',
  WEATHER_NEWS = 'weather_news',
  ROLE_DETECTION = 'role_detection',
  GUARDIAN_DASHBOARD = 'guardian_dashboard',
  MED_CAPTURE = 'med_capture',
  TEST = 'test'
}

export enum UserRole {
  UNDETERMINED = 'undetermined',
  ELDERLY = 'elderly',
  CHILD = 'child'
}

export interface MedRecord {
  id: string;
  medName: string;
  time: string;
  timestamp: number;
  evidenceImage?: string; 
  videoData?: string; // Base64 video string
  status: 'pending' | 'verified' | 'skipped';
  isVideoUploaded?: boolean;
}

export interface HealthLog {
  id: string;
  type: 'fall' | 'med_done' | 'active' | 'connection' | 'voice_trigger' | 'high_priority_med';
  timestamp: number;
  detail: string;
  statusText?: string;
  mediaUrl?: string;
}

export interface SyncData {
  user_status: 'quiet' | 'walking' | 'intense' | 'unknown';
  step_count: number;
  last_heartbeat: number;
  location?: { lat: number; lng: number };
  current_route?: AppRoute;
  completed_reminder_ids?: string[];
  has_med_medal?: boolean;
  is_falling?: boolean; 
}

// 远程指令配置
export interface RemoteConfig {
  alarms: Alarm[];
  volume: number;
  target_reminder_ids: string[];
}

export type Language = 'zh-CN' | 'zh-TW' | 'en';

export interface SensorData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export interface FamilyNote {
  id: string;
  sender: string;
  content: string;
  time: string;
}

export const WAKE_WORD_REGEX = /(小玲|小灵|肖玲|晓铃|小领|晓玲|晓灵|小林|小琳|晓琳|晓临|筱玲)/;

export const INTENT_KEYWORDS = {
  MEDICINE: ["吃药", "用药", "药片", "药瓶", "核对", "喝药", "扫药"],
  VISION: ["打开摄像头", "开启摄像头", "扫描", "看东西", "帮我看看", "这是什么", "识别", "拍照", "识物"],
  WEATHER: ["天气", "穿什么", "冷不冷", "气温", "几度"],
  NEWS: ["新闻", "头条", "发生什么", "新鲜事", "播报"],
  CALL: ["视频", "通话", "儿子", "女儿", "视频通话", "打电话", "连线"],
  FAMILY: ["留言", "亲情", "孩子们", "写信", "看孩子"],
  ALARM: ["闹钟", "时间", "几点"],
  CHAT: ["聊天", "说话", "解闷"],
  SWITCH_CAMERA: ["切换", "换个镜头", "换一个", "看不清", "反过来", "前后切换"]
};