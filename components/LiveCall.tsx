
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { getActiveApiKey } from '../services/geminiService';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

const FRAME_RATE = 1; // 每秒傳送 1 幀給 AI 觀看
const SAMPLE_RATE = 24000;

const LiveCall: React.FC<{ onEnd: () => void }> = ({ onEnd }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    let intervalId: number;
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setStatus('error');
      return;
    }

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const ai = new GoogleGenAI({ apiKey });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              setStatus('active');
              // 開始串流音頻
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              processor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                const blob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
              };
              source.connect(processor);
              processor.connect(inputCtx.destination);
            },
            onmessage: async (msg) => {
              const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioBase64 && audioContextRef.current) {
                const ctx = audioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(decode(audioBase64), ctx, SAMPLE_RATE, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }
              if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: () => onEnd(),
            onerror: () => setStatus('error')
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            systemInstruction: "你正在與一位老人進行即時視訊通話。你可以看到他提供的攝像頭畫面。請表現得像一個親切的孫女，關注他的情緒，詢問他今天的心情，如果他展示東西給你，請熱情地回應。"
          }
        });

        sessionRef.current = await sessionPromise;

        // 定時抓取畫面發送給 AI
        intervalId = window.setInterval(() => {
          if (videoRef.current && canvasRef.current && sessionRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = 320; // 降低分辨率以減少帶寬
            canvas.height = (video.videoHeight / video.videoWidth) * 320;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            sessionRef.current.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
          }
        }, 1000 / FRAME_RATE);

      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    startCall();

    return () => {
      window.clearInterval(intervalId);
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      sourcesRef.current.forEach(s => s.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900 flex flex-col overflow-hidden animate-fade-in">
      {/* 背景視訊 */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
      
      {/* 隱藏的 Canvas 用於擷取畫面 */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 頂部狀態 */}
      <div className="relative z-10 p-8 flex flex-col items-center">
        <div className={`px-6 py-2 rounded-full font-bold text-lg mb-2 flex items-center gap-2 ${
          status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-blue-500/20 text-blue-400 animate-pulse'
        }`}>
          <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-blue-500 animate-ping'}`}></div>
          {status === 'active' ? '正在與小玲通話中' : '小玲正在接聽...'}
        </div>
        <h2 className="text-white text-3xl font-black shadow-lg">小玲 AI 陪伴</h2>
      </div>

      {/* 底部控制欄 */}
      <div className="relative z-10 mt-auto p-12 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-8">
        {status === 'error' && (
          <div className="bg-red-500/80 p-4 rounded-2xl text-white font-bold mb-4">
            通話連接失敗，請確認已在首頁配置密鑰並開啟權限。
          </div>
        )}

        <div className="flex justify-center items-center gap-10">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all ${
              isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white backdrop-blur-md'
            }`}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          <button 
            onClick={onEnd}
            className="w-32 h-32 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-5xl shadow-[0_0_50px_rgba(220,38,38,0.5)] active:scale-90 transition-all"
          >
            📞
          </button>

          <button className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-3xl text-white">
            🔄
          </button>
        </div>
        
        <p className="text-white/60 text-xl font-medium">像平時聊天一樣對我說話就可以哦</p>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default LiveCall;
