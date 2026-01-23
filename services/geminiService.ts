
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = "你是一个温柔、耐心的老年人关怀助手，名叫'小玲'。你的任务是陪伴老人，回答他们的问题，提醒他们保持健康，语气要像家人一样亲切。请使用简单易懂的词汇。";

// 使用推荐的最新模型，性能更好且支持更广
const MODEL_NAME = 'gemini-3-flash-preview';

export const getGeminiResponse = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "对不起，我没听清楚，请再说一遍。";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // 针对免费版额度限制的特殊处理
    if (error?.message?.includes('429')) {
      return "对不起，小玲现在有点忙（请求太频繁了），请稍等一分钟再跟我聊天吧。";
    }
    return "网络好像有点累了，休息一下再聊吧。";
  }
};

export const getGeminiAudioResponse = async (base64Audio: string) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm;codecs=opus',
              data: base64Audio,
            },
          },
          {
            text: "请听这段老人的语音并给出亲切的回答。",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "对不起，我没听清楚，请再说一遍。";
  } catch (error: any) {
    console.error("Gemini Audio Error:", error);
    if (error?.message?.includes('429')) {
      return "对不起，小玲现在有点忙，请稍等一分钟再说话。";
    }
    return "抱歉，刚才信号不太好，能请您再说一次吗？";
  }
};

export const identifyPerson = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: "分析这张图片中的人。已知熟人名单：1. 儿子小明（戴眼镜，微胖，穿蓝色外套）；2. 女儿小红（长发，爱笑，穿红色毛衣）；3. 邻居王大爷（白头发，慈祥）。如果图片中的人符合描述，请告诉我他是谁；如果不符合，请委婉地提醒我可能有陌生人，并告诉我这个人的特征。回答要亲切，像在跟长辈说话。",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "画面太模糊了，我看不清是谁。";
  } catch (error: any) {
    console.error("Vision Error:", error);
    return "小玲现在看不清画面，请稍后再试。";
  }
};

export const playTTS = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `用亲切自然的声音说：${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
      );
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.start();
      return true;
    }
    return false;
  } catch (error) {
    console.error("TTS Error:", error);
    return false;
  }
};
