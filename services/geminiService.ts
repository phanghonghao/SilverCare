
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";

const SYSTEM_INSTRUCTION = "你是一个温柔、耐心的老年人关怀助手，名叫'小玲'。你的任务是陪伴老人，回答他们的问题，语气要像家人一样亲切。请使用简单易懂的词汇，遇到药品说明时要特别提醒遵医嘱。";

const TEXT_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// 本地存储的 Key 名
const STORAGE_KEY = 'SILVERCARE_USER_API_KEY';

/**
 * 保存用户输入的密钥
 */
export const saveUserApiKey = (key: string) => {
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
    return true;
  }
  return false;
};

/**
 * 获取当前有效的 API Key
 */
export const getActiveApiKey = () => {
  return localStorage.getItem(STORAGE_KEY) || process.env.API_KEY || "";
};

/**
 * 获取 AI 实例
 */
const getAI = () => {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const getApiKeyStatus = () => {
  const userKey = localStorage.getItem(STORAGE_KEY);
  const envKey = process.env.API_KEY;
  
  if (userKey) return { source: "已手动配置密钥", display: `${userKey.substring(0, 6)}...${userKey.substring(userKey.length - 4)}`, configured: true };
  if (envKey) return { source: "系统注入密钥", display: `${envKey.substring(0, 6)}...${envKey.substring(envKey.length - 4)}`, configured: true };
  
  return { source: "未配置密钥", display: "无", configured: false };
};

export const getGeminiResponse = async (prompt: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text || "对不起，我没听清楚，请再说一遍。";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message === "NO_API_KEY") return "ERROR_NO_KEY";
    return "小玲连接不到大脑了，请检查网络或点击首页“配置密钥”。";
  }
};

export const explainEverything = async (base64Image: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "请帮我看看图片里是什么。用通俗易懂的大白话解释。" }
        ]
      },
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text || "没看清楚。";
  } catch (error) {
    return "网络不太稳定，看图失败。";
  }
};

export const identifyPerson = async (base64Image: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "请看看门口是谁？如果是陌生人，请提醒我注意安全。" }
        ]
      },
      config: { systemInstruction: SYSTEM_INSTRUCTION }
    });
    return response.text || "看不太清。";
  } catch (error) {
    return "功能暂时不可用。";
  }
};

export const playTTS = async (text: string) => {
  try {
    const apiKey = getActiveApiKey();
    if (!apiKey) return false;
    
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.start();
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};
