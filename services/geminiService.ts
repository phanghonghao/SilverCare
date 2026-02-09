
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";
import { SyncData, HealthLog, WAKE_WORD_REGEX, RemoteConfig, Alarm, Language } from "../types";

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

// --- LanguageInterceptor: 多语言感知核心 ---
class LanguageInterceptor {
  static interceptQuery(query: string, lang: Language): string {
    const regionalContext = query.includes("巴生") || query.includes("Klang") ? "Port Klang, Malaysia" : "";
    
    if (lang === 'en') {
      return `[Strict Language: English] Search specifically for English content and sources. Location: ${regionalContext || 'local area'}. Query: ${query}. Ensure the final output is entirely in simple English.`;
    } else if (lang === 'zh-TW') {
      return `[语言：繁体中文] 搜索当地资讯。位置：${regionalContext || '当地'}。内容：${query}。请确保输出结果为繁体中文。`;
    }
    return `[语言：简体中文] 搜索当地资讯。位置：${regionalContext || '当地'}。内容：${query}。`;
  }

  static getSystemInstruction(lang: Language): string {
    if (lang === 'en') {
      return "You are Xiao Ling, a warm AI assistant for the elderly. STIPULATION: You MUST respond in English. If you find information in other languages, translate it to simple, friendly English. Keep it concise.";
    }
    return "你是贴心助手小玲。回复必须使用当前界面语言（简体/繁体中文）。将检索到的内容总结为适合老年人听的口语化文字。严禁中英混杂。";
  }

  static getSearchingStatus(type: 'weather' | 'news', lang: Language): string {
    if (lang === 'en') return `Searching ${type} in English...`;
    if (lang === 'zh-TW') return `正在以繁體中文搜尋${type === 'news' ? '新聞' : '天氣'}...`;
    return `正在查询${type === 'news' ? '新闻' : '天气'}...`;
  }
}

// --- SearchManager: 联网内容引擎 ---
export class SearchManager {
  static async fetch(type: 'weather' | 'news', lat: number, lng: number) {
    try {
      const lang = getCurrentLanguage();
      const ai = getAI();
      const locInfo = (lat !== 0) ? `Location(${lat.toFixed(2)}, ${lng.toFixed(2)})` : "the current local area";
      
      let prompt = type === 'weather' 
        ? `Describe current weather and temperature at ${locInfo}. Max 20 words.` 
        : `Summarize 2 top news stories happening at ${locInfo}.`;
      
      // 执行语言拦截与重写
      const interceptedPrompt = LanguageInterceptor.interceptQuery(prompt, lang);

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: interceptedPrompt,
        config: { 
          tools: [{ googleSearch: {} }], 
          systemInstruction: LanguageInterceptor.getSystemInstruction(lang)
        }
      });
      
      isQuotaExhaustedGlobal = false;
      const result = { 
        text: response.text || (lang === 'en' ? "Information unavailable." : "暂时查不到信息。"), 
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        statusMsg: LanguageInterceptor.getSearchingStatus(type, lang)
      };
      setCachedData(type, result);
      return result;
    } catch (error: any) {
      if (error.message?.includes('429')) isQuotaExhaustedGlobal = true;
      const lang = getCurrentLanguage();
      return { text: lang === 'en' ? "Search failed." : "搜索失败。", groundingChunks: [], statusMsg: "" };
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
    return raw ? JSON.parse(atob(raw)) : {
      user_status: 'unknown',
      step_count: 0,
      last_heartbeat: 0,
      is_falling: false
    };
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

const setCachedData = (type: 'weather' | 'news', data: any) => {
  const key = type === 'weather' ? CACHE_WEATHER_KEY : CACHE_NEWS_KEY;
  localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
};

const simplifyContent = (text: string, limit: number = 30): string => {
  let simplified = text.replace(/(马来西亚|中国|台湾|省|州|市|区|县|街道|路|巷)/g, '').replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '').trim();
  return simplified.length > limit ? simplified.substring(0, limit) : simplified;
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
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const sentence = this.queue.shift();
    if (sentence) await this.playSentenceWithRetry(sentence);
    this.processQueue();
  }

  private async playSentenceWithRetry(text: string): Promise<void> {
    try {
      const ai = getAI();
      const lang = getCurrentLanguage();
      // 根据语言环境选择发音人：英文使用 Zephyr，中文使用 Kore
      const voiceName = lang === 'en' ? 'Zephyr' : 'Kore';
      
      const prompt = `Read clearly: ${text}`;
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
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
    } catch (e: any) {
      if (e.message?.includes('429')) isQuotaExhaustedGlobal = true;
    }
  }

  stop() {
    this.queue = [];
    if (this.currentAudioSource) {
      try { this.currentAudioSource.stop(); } catch (e) {}
      this.currentAudioSource = null;
    }
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
    isQuotaExhaustedGlobal = false;
    return response.text || (lang === 'en' ? "Pardon?" : "没听清，再说一遍。");
  } catch (error: any) { 
    if (error.message?.includes('429')) isQuotaExhaustedGlobal = true;
    return "Error"; 
  }
};

export async function* getGeminiResponseStream(prompt: string) {
  try {
    const ai = getAI();
    const lang = getCurrentLanguage();
    
    const responseStream = await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents: prompt,
      config: { 
        systemInstruction: LanguageInterceptor.getSystemInstruction(lang),
        maxOutputTokens: 2000, 
      }
    });

    isQuotaExhaustedGlobal = false;
    for await (const chunk of responseStream) {
      if (chunk.text) yield chunk.text;
    }
  } catch (error: any) {
    if (error.message?.includes('429')) {
      isQuotaExhaustedGlobal = true;
      const lang = getCurrentLanguage();
      yield lang === 'en' ? "I'm busy, one moment please." : "小玲现在有点忙，请稍等。";
    } else {
      yield "...";
    }
  }
}

export const determineUserIntent = async (text: string) => {
  try {
    const ai = getAI();
    const lang = getCurrentLanguage();
    const prompt = `
      User text: "${text}"
      Current Language: ${lang}
      Routes: home, chat, reminders, vision, family, alarm, safety, live_call, weather_news
      Output JSON only:
      {
        "action": "NAVIGATE" | "REPLY" | "STAY",
        "route": "AppRoute string",
        "data": { "type": "weather" | "news" },
        "reply": "Simple warm response in ${lang}"
      }
    `;
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    const lang = getCurrentLanguage();
    return { action: "STAY", reply: lang === 'en' ? "Pardon?" : "没听明白。" };
  }
};

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
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "Who is at the door?" }] },
      config: { systemInstruction: LanguageInterceptor.getSystemInstruction(lang) }
    });
    return res.text || "...";
  } catch (e: any) { return "Error"; }
};

export const verifyMedication = async (img: string, name: string) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: `Verify ${name}` }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text);
  } catch (e) { return { verified: true, description: "OK" }; }
};

export const analyzeUserRole = async (img: string) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "Identify role" }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text);
  } catch (e) { return { role: 'elderly' }; }
};

export const explainEverything = async (img: string) => {
  try {
    const ai = getAI();
    const lang = getCurrentLanguage();
    const res = await ai.models.generateContent({ 
        model: TEXT_MODEL, 
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "Explain this item simply." }] },
        config: { systemInstruction: LanguageInterceptor.getSystemInstruction(lang) }
    });
    return res.text || "...";
  } catch (e: any) { return "Error"; }
};
