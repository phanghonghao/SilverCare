
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";
import { SyncData, HealthLog, WAKE_WORD_REGEX, RemoteConfig, Alarm, Language, AppRoute } from "../types";

const TEXT_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const STORAGE_KEY_NAME = 'SILVERCARE_USER_API_KEY';
const CLOUD_SYNC_KEY = 'SILVERCARE_CLOUD_DATA';
const SAFETY_LOG_KEY = 'SILVERCARE_SAFETY_LOGS';
const CACHE_WEATHER_KEY = 'SILVERCARE_CACHE_WEATHER';
const CACHE_NEWS_KEY = 'SILVERCARE_CACHE_NEWS';
const REMOTE_CONFIG_KEY = 'SILVERCARE_REMOTE_CONFIG';

const CACHE_EXPIRY = 2 * 60 * 60 * 1000;

let isQuotaExhaustedGlobal = false;
export const checkQuotaStatus = () => isQuotaExhaustedGlobal;

const getCurrentLanguage = (): Language => {
  return (localStorage.getItem('SILVERCARE_LANGUAGE') as Language) || 'zh-CN';
};

// --- LanguageInterceptor ---
class LanguageInterceptor {
  static interceptQuery(query: string, lang: Language): string {
    const isKlang = query.includes("巴生") || query.includes("Klang");
    const loc = isKlang ? "Port Klang, Malaysia" : "local area";
    if (lang === 'en') {
      return `[System Language: English] Please search for latest news in ${loc}. STRATEGY: Prioritize English sources like 'The Star', 'CNA'. Output English.`;
    }
    return `[系统语言：${lang === 'zh-TW' ? '繁体中文' : '简体中文'}] 搜索${loc}的本地资讯。总结为适合老人听的口语。`;
  }

  static getSystemInstruction(lang: Language): string {
    if (lang === 'en') {
      return "You are Xiao Ling, a warm AI companion. You MUST respond in clear English. Keep instructions simple for elderly users.";
    }
    return "你是贴心助手小玲。回复必须使用当前界面语言。总结为适合老年人的口语化文字，严禁中英混杂。";
  }
}

// --- IntentEngine: 自然语言意图识别 ---
export class IntentEngine {
  static async determine(text: string, currentLang: Language) {
    try {
      const ai = getAI();
      const prompt = `
        User input: "${text}"
        Current Language: ${currentLang}
        Valid App Routes: home, chat, reminders, vision, family, alarm, safety, live_call, weather_news
        
        Tasks:
        1. Classify the intent into one of the routes.
        2. If user mentions "news" or "weather", set data.type accordingly.
        3. If user mentions "alarm" or "time", try to extract HH:mm.
        4. If it's just general conversation, use action "REPLY".
        
        JSON Schema:
        {
          "action": "NAVIGATE" | "REPLY" | "ALARM_ADD",
          "route": "AppRoute value",
          "data": { "type": "weather" | "news", "time": "HH:mm", "label": "string" },
          "reply": "Short, warm confirmation in ${currentLang}"
        }
      `;
      
      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      return JSON.parse(response.text || '{}');
    } catch (e) {
      return { action: "REPLY", reply: currentLang === 'en' ? "Pardon?" : "没听明白。" };
    }
  }
}

export const determineUserIntent = async (text: string) => {
  return await IntentEngine.determine(text, getCurrentLanguage());
};

// --- SearchManager ---
export class SearchManager {
  static async fetch(type: 'weather' | 'news', lat: number, lng: number) {
    try {
      const lang = getCurrentLanguage();
      const ai = getAI();
      let prompt = type === 'weather' ? `Current weather.` : `Top headlines.`;
      const interceptedPrompt = LanguageInterceptor.interceptQuery(prompt, lang);
      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: interceptedPrompt,
        config: { tools: [{ googleSearch: {} }], systemInstruction: LanguageInterceptor.getSystemInstruction(lang) }
      });
      return { 
        text: response.text || "...", 
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        statusMsg: lang === 'en' ? "Searching in English..." : "正在查询..."
      };
    } catch (error: any) {
      if (error.message?.includes('429')) isQuotaExhaustedGlobal = true;
      return { text: "Error", groundingChunks: [], statusMsg: "" };
    }
  }
}

// --- DataSyncManager ---
export class DataSyncManager {
  static async pushStatus(data: Partial<SyncData>) {
    const current = this.getLatestSyncData();
    const updated = { ...current, ...data, last_heartbeat: Date.now() };
    localStorage.setItem(CLOUD_SYNC_KEY, btoa(JSON.stringify(updated)));
    window.dispatchEvent(new Event('storage'));
  }
  static async pushConfig(config: Partial<RemoteConfig>) {
    const current = this.getRemoteConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  }
  static getLatestSyncData(): SyncData {
    const raw = localStorage.getItem(CLOUD_SYNC_KEY);
    return raw ? JSON.parse(atob(raw)) : { user_status: 'unknown', step_count: 0, last_heartbeat: 0, is_falling: false };
  }
  static getRemoteConfig(): RemoteConfig {
    const raw = localStorage.getItem(REMOTE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : { alarms: [], volume: 80, target_reminder_ids: [] };
  }
  static subscribe(callback: () => void) {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }
}

export const getCachedData = (type: 'weather' | 'news') => {
  const key = type === 'weather' ? CACHE_WEATHER_KEY : CACHE_NEWS_KEY;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_EXPIRY) return parsed.data;
  } catch (e) { return null; }
  return null;
};

class TTSManager {
  private queue: string[] = [];
  private isPlaying = false;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private audioCtx: AudioContext | null = null;

  async speak(text: string, immediate: boolean = false) {
    if (immediate) this.stop();
    const sentences = text.split(/[。？！；]|\n/).filter(s => s.trim().length > 1);
    this.queue.push(...sentences);
    if (!this.isPlaying) this.processQueue();
  }
  private async processQueue() {
    if (this.queue.length === 0) { this.isPlaying = false; return; }
    this.isPlaying = true;
    const sentence = this.queue.shift();
    if (sentence) await this.playSentenceWithRetry(sentence);
    this.processQueue();
  }
  private async playSentenceWithRetry(text: string): Promise<void> {
    try {
      const ai = getAI();
      const lang = getCurrentLanguage();
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: `Read: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: lang === 'en' ? 'Zephyr' : 'Kore' } } }
        }
      });
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = part?.inlineData?.data;
      if (base64Audio) {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(decode(base64Audio), this.audioCtx, 24000, 1);
        return new Promise<void>((resolve) => {
          if (!this.audioCtx) return resolve();
          const source = this.audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(this.audioCtx.destination);
          this.currentAudioSource = source;
          source.onended = () => resolve();
          source.start();
        });
      }
    } catch (e: any) {}
  }
  stop() {
    this.queue = [];
    if (this.currentAudioSource) { try { this.currentAudioSource.stop(); } catch (e) {} this.currentAudioSource = null; }
    this.isPlaying = false;
  }
}

const ttsManager = new TTSManager();
export const playTTS = (text: string, immediate: boolean = true) => ttsManager.speak(text, immediate);
export const stopTTS = () => ttsManager.stop();

export const getActiveApiKey = () => localStorage.getItem(STORAGE_KEY_NAME) || process.env.API_KEY || "";
const getAI = () => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");
  return new GoogleGenAI({ apiKey });
};

export const fetchWeatherOrNews = async (type: 'weather' | 'news', lat: number, lng: number) => {
  return await SearchManager.fetch(type, lat, lng);
};

export const getGeminiResponse = async (prompt: string) => {
  try {
    const ai = getAI();
    const lang = getCurrentLanguage();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { systemInstruction: LanguageInterceptor.getSystemInstruction(lang) }
    });
    return response.text || "...";
  } catch (error: any) { return "Error"; }
};

export async function* getGeminiResponseStream(prompt: string) {
  try {
    const ai = getAI();
    const lang = getCurrentLanguage();
    const responseStream = await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents: prompt,
      config: { systemInstruction: LanguageInterceptor.getSystemInstruction(lang) }
    });
    for await (const chunk of responseStream) {
      if (chunk.text) yield chunk.text;
    }
  } catch (error: any) { yield "..."; }
}

export const matchWakeWord = (text: string): boolean => WAKE_WORD_REGEX.test(text);
export const addSafetyLog = (log: HealthLog) => {
  const logs = JSON.parse(localStorage.getItem(SAFETY_LOG_KEY) || '[]');
  localStorage.setItem(SAFETY_LOG_KEY, JSON.stringify([log, ...logs].slice(0, 50)));
  window.dispatchEvent(new Event('storage'));
};
export const getSafetyLogs = (): HealthLog[] => JSON.parse(localStorage.getItem(SAFETY_LOG_KEY) || '[]');

export const identifyPerson = async (img: string) => {
  try {
    const ai = getAI();
    const lang = getCurrentLanguage();
    const res = await ai.models.generateContent({ 
      model: TEXT_MODEL, 
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "Identify." }] },
      config: { systemInstruction: LanguageInterceptor.getSystemInstruction(lang) }
    });
    return res.text || "...";
  } catch (e: any) { return "Error"; }
};

export const verifyMedication = async (img: string, name: string) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: `Verify med: ${name}` }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text);
  } catch (e) { return { verified: true }; }
};

export const analyzeUserRole = async (img: string) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "Role." }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text);
  } catch (e) { return { role: 'elderly' }; }
};

export const explainEverything = async (img: string) => {
  try {
    const ai = getAI();
    const lang = getCurrentLanguage();
    const res = await ai.models.generateContent({ 
        model: TEXT_MODEL, 
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "Explain." }] },
        config: { systemInstruction: LanguageInterceptor.getSystemInstruction(lang) }
    });
    return res.text || "...";
  } catch (e: any) { return "Error"; }
};
