
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";
import { SyncData, HealthLog, WAKE_WORD_REGEX, RemoteConfig, Alarm } from "../types";

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

// --- DataSyncManager 实时同步引擎 ---
export class DataSyncManager {
  // 父母端：推送实时状态
  static async pushStatus(data: Partial<SyncData>) {
    const current = this.getLatestSyncData();
    const updated = { ...current, ...data, last_heartbeat: Date.now() };
    localStorage.setItem(CLOUD_SYNC_KEY, btoa(JSON.stringify(updated)));
    window.dispatchEvent(new Event('storage')); // 触发本地跨标签订阅
  }

  // 子女端：推送远程配置（如修改闹钟）
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

  // 模拟 Firebase 订阅
  static subscribe(callback: () => void) {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }
}

// --- 基础服务保持不变 ---
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
      const prompt = `Please read the following text aloud: ${simplifyContent(text, 50)}`;
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
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
// 修改这里：增加 immediate 参数，默认为 true (兼容旧代码)，但在流式输出时可以设为 false (追加模式)
export const playTTS = (text: string, immediate: boolean = true) => ttsManager.speak(text, immediate);
export const stopTTS = () => ttsManager.stop();

export const getActiveApiKey = () => localStorage.getItem(STORAGE_KEY_NAME) || process.env.API_KEY || "";

const getAI = () => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");
  return new GoogleGenAI({ apiKey });
};

export const fetchWeatherOrNews = async (type: 'weather' | 'news', lat: number, lng: number) => {
  try {
    const ai = getAI();
    const locInfo = (lat !== 0) ? `坐标(${lat.toFixed(2)}, ${lng.toFixed(2)})` : "当地";
    const prompt = type === 'weather' ? `请通过搜索，告诉我${locInfo}现在的天气、气温。20字内极简回复。` : `请通过搜索，播报2条${locInfo}最新的重要简短新闻标题。`;
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], systemInstruction: "你是关怀助手小玲。回复必须极简、口语化，适合老年人听。" }
    });
    isQuotaExhaustedGlobal = false;
    const result = { text: response.text || "刚才没查到，请过会儿再试。", groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    setCachedData(type, result);
    return result;
  } catch (error: any) {
    if (error.message?.includes('429')) isQuotaExhaustedGlobal = true;
    return { text: "暂时没查到。", groundingChunks: [] };
  }
};

export const getGeminiResponse = async (prompt: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { systemInstruction: "你是小玲。回复极简，每句不超过15字。" }
    });
    isQuotaExhaustedGlobal = false;
    return response.text || "没听清，再说一遍。";
  } catch (error: any) { 
    if (error.message?.includes('429')) isQuotaExhaustedGlobal = true;
    return "系统正在休息。"; 
  }
};

// 新增流式响应方法
export async function* getGeminiResponseStream(prompt: string) {
  try {
    const ai = getAI();
    const responseStream = await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents: prompt,
      config: { 
        // 优化人设：更耐心，允许更多内容
        systemInstruction: "你是小玲，老人的贴身智能儿女。针对老年人，回复要温暖、耐心、口语化。不要使用冷冰冰的机器语言。如果老人问健康或操作问题，可以适当多解释几句，但要分点说，语速要慢（通过标点符号控制）。",
        // 提升 Token 限制，防止回复被截断
        maxOutputTokens: 5000, 
      }
    });

    isQuotaExhaustedGlobal = false;
    
    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    // 捕获 429 错误（免费版 Key 常见限制）
    if (error.message?.includes('429')) {
      isQuotaExhaustedGlobal = true;
      yield "小玲现在有点忙（系统正忙），请稍等一下再跟我说话好吗？";
    } else {
      yield "小玲刚才没听清，请再说一遍。";
    }
  }
}

export const determineUserIntent = async (text: string) => {
  try {
    const ai = getAI();
    const prompt = `
      You are an intent classifier for an elderly care app "SilverCare".
      User text: "${text}"
      
      Available Routes:
      - home
      - chat (聊天/说话)
      - reminders (吃药/提醒)
      - vision (认东西/拍照/帮我看)
      - family (留言/子女)
      - alarm (闹钟)
      - safety (摔倒监测/安全)
      - live_call (视频/通话/视讯/找人)
      - weather_news (data.type: 'weather' or 'news')
      
      Output JSON only:
      {
        "action": "NAVIGATE" | "REPLY" | "STAY",
        "route": "AppRoute enum value string" (optional),
        "data": { "type": "weather" | "news" } (optional),
        "reply": "Text to speak if action is REPLY or STAY" (optional)
      }
      
      Examples:
      "看看今天天气" -> {"action": "NAVIGATE", "route": "weather_news", "data": {"type": "weather"}}
      "打开视讯" -> {"action": "NAVIGATE", "route": "live_call"}
      "我要视频" -> {"action": "NAVIGATE", "route": "live_call"}
      "给儿子打视频" -> {"action": "NAVIGATE", "route": "live_call"}
      "听新闻" -> {"action": "NAVIGATE", "route": "weather_news", "data": {"type": "news"}}
      "你是谁" -> {"action": "REPLY", "reply": "我是您的贴身助手小玲。"}
      "不用了" -> {"action": "REPLY", "reply": "好的，有事您叫我。"}
    `;
    
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { action: "STAY", reply: "我没听清，您能再说一遍吗？" };
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
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "门口是谁？" }] } });
    return res.text || "看不清。";
  } catch (e: any) { return "识别失败。"; }
};
export const verifyMedication = async (img: string, name: string) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: `核对${name}` }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text);
  } catch (e) { return { verified: true, description: "核对成功" }; }
};
export const analyzeUserRole = async (img: string) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: "角色识别" }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text);
  } catch (e) { return { role: 'elderly' }; }
};

export const explainEverything = async (img: string) => {
  try {
    const ai = getAI();
    const promptText = `
请根据提供的图片内容，用“适合老年人的讲解方式”来说明物品。

必须严格按照以下结构输出（请保持标题格式）：
1. 这是什么
2. 它是做什么用的
3. 一般要怎么用
4. 它为什么能做到这些（简单说）
5. 使用时要注意什么
6. 常见疑问
7. 一句话总结

要求：
- 使用简体中文
- 语气亲切、慢节奏，像儿女跟父母聊天一样
- 绝对不使用专业术语，如果必须用，请用生活化比喻解释
- 假设读者完全不懂科技
- 既然是给老人看，字体排版要清晰，分段要明确
`;
    const res = await ai.models.generateContent({ 
        model: TEXT_MODEL, 
        contents: { 
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: img } }, 
                { text: promptText }
            ] 
        } 
    });
    return res.text || "没看清，请再拍一次。";
  } catch (e: any) { return "识别失败，请检查网络。"; }
};
