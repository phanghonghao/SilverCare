
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { getActiveApiKey } from '../services/geminiService';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { useLanguage } from '../contexts/LanguageContext';

const OUTPUT_SAMPLE_RATE = 24000;

const LiveCall: React.FC<{ onEnd: () => void, voiceSwitchTrigger?: number, initialPrompt?: string }> = ({ onEnd, voiceSwitchTrigger, initialPrompt }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [hasMic, setHasMic] = useState(true);
  
  // Device management mirroring old version
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  const [history, setHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isSessionActive = useRef(false);
  const isMutedRef = useRef(false);
  const isSettingUpRef = useRef(false);

  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIndicatorRef = useRef<HTMLDivElement>(null);

  const inputTransRef = useRef('');
  const outputTransRef = useRef('');

  useEffect(() => { 
    isMutedRef.current = isMuted; 
    if (isMuted && volumeIndicatorRef.current) volumeIndicatorRef.current.style.height = '0%';
  }, [isMuted]);

  const handleStopTalking = () => {
    if (sourcesRef.current.size > 0) {
      sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
  };

  // Robust setupMedia logic with Fallback
  const setupMedia = async (deviceIndex: number) => {
    if (isSettingUpRef.current) return;
    isSettingUpRef.current = true;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);

      const targetDevice = videoDevices[deviceIndex];
      
      // Attempt 1: Audio + Video
      let stream: MediaStream | null = null;
      let micWorking = true;

      try {
        const constraints: MediaStreamConstraints = { 
            audio: true, 
            video: targetDevice?.deviceId ? { deviceId: { exact: targetDevice.deviceId } } : true 
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        console.warn("AV Request Failed", err);
        // Attempt 2: Video Only (Fallback)
        try {
            const constraintsVideoOnly: MediaStreamConstraints = { 
                audio: false, 
                video: targetDevice?.deviceId ? { deviceId: { exact: targetDevice.deviceId } } : true 
            };
            stream = await navigator.mediaDevices.getUserMedia(constraintsVideoOnly);
            micWorking = false;
        } catch (err2: any) {
            console.error("Video Request Failed", err2);
            throw err2;
        }
      }
      
      setHasMic(micWorking);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }

      // Connect to AudioContext only if we have audio tracks
      if (inputCtxRef.current && processorRef.current) {
        if (sourceNodeRef.current) {
           try { sourceNodeRef.current.disconnect(); } catch(e) {}
           sourceNodeRef.current = null;
        }
        
        if (micWorking && stream.getAudioTracks().length > 0) {
             if (inputCtxRef.current.state === 'suspended') {
                await inputCtxRef.current.resume();
             }

             const source = inputCtxRef.current.createMediaStreamSource(stream);
             
             // Setup analyser
             if (!analyserRef.current) {
                analyserRef.current = inputCtxRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
             }

             source.connect(analyserRef.current);
             analyserRef.current.connect(processorRef.current);
             sourceNodeRef.current = source;
        }
      }

    } catch (e: any) { 
        console.error("Setup Fatal Error", e);
        setStatus('error');
    } finally {
        isSettingUpRef.current = false;
    }
  };

  // Trigger setup on device change
  useEffect(() => {
    if (status !== 'error') {
       setupMedia(currentDeviceIndex);
    }
  }, [currentDeviceIndex]);

  const cycleCamera = () => {
    if (devices.length <= 1) return;
    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);
  };

  useEffect(() => {
    if (voiceSwitchTrigger !== undefined && voiceSwitchTrigger > 0) {
      cycleCamera();
    }
  }, [voiceSwitchTrigger]);

  // Volume UI loop
  useEffect(() => {
    let animId: number;
    const updateVol = () => {
      if (volumeIndicatorRef.current && analyserRef.current && !isMutedRef.current && hasMic) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a,b)=>a+b,0) / data.length;
        const h = Math.min(100, avg * 1.5);
        volumeIndicatorRef.current.style.height = `${h}%`;
        volumeIndicatorRef.current.style.backgroundColor = h > 80 ? '#ef4444' : '#4ade80';
      }
      animId = requestAnimationFrame(updateVol);
    };
    updateVol();
    return () => cancelAnimationFrame(animId);
  }, [hasMic]);

  useEffect(() => {
    let intervalId: number;
    const apiKey = getActiveApiKey();
    if (!apiKey) { setStatus('error'); return; }

    const startCall = async () => {
      try {
        const AudioCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
        
        // Output context
        audioContextRef.current = new AudioCtxClass({ sampleRate: OUTPUT_SAMPLE_RATE });
        
        // Input context
        inputCtxRef.current = new AudioCtxClass({ sampleRate: 16000 });
        
        await audioContextRef.current.resume();
        await inputCtxRef.current.resume();
        
        const processor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (isMutedRef.current || !isSessionActive.current) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Simple conversion
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
             let s = Math.max(-1, Math.min(1, inputData[i]));
             int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          sessionPromiseRef.current?.then((session) => {
            session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } });
          });
        };
        
        processor.connect(inputCtxRef.current.destination);
        processorRef.current = processor;

        // Trigger media setup explicitly
        await setupMedia(currentDeviceIndex);

        const ai = new GoogleGenAI({ apiKey });
        
        const connectPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => { setStatus('active'); isSessionActive.current = true; },
            onmessage: async (msg: LiveServerMessage) => {
              const parts = msg.serverContent?.modelTurn?.parts || [];
              for (const part of parts) {
                  const audioBase64 = part.inlineData?.data;
                  if (audioBase64 && audioContextRef.current) {
                    const ctx = audioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    const buffer = await decodeAudioData(decode(audioBase64), ctx, OUTPUT_SAMPLE_RATE, 1);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                    sourcesRef.current.add(source);
                    source.onended = () => sourcesRef.current.delete(source);
                  }
              }
              
              if (msg.serverContent?.interrupted) handleStopTalking();

              const inTr = msg.serverContent?.inputTranscription;
              if (inTr) inputTransRef.current += inTr.text;
              const outTr = msg.serverContent?.outputTranscription;
              if (outTr) outputTransRef.current += outTr.text;

              if (msg.serverContent?.turnComplete) {
                const userText = inputTransRef.current.trim();
                const modelText = outputTransRef.current.trim();
                if (userText || modelText) {
                   setHistory(prev => [...prev, ...(userText ? [{role:'user' as const, text:userText}] : []), ...(modelText ? [{role:'model' as const, text:modelText}] : [])]);
                }
                inputTransRef.current = ''; outputTransRef.current = '';
              }
            },
            onclose: () => { isSessionActive.current = false; onEnd(); },
            onerror: (e) => { setStatus('error'); console.error(e); }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: `你是小玲，正在视频通话。关心老人的身体。${initialPrompt ? `\n\n[CONTEXT] 用户刚通过语音唤醒你，并说了: "${initialPrompt}"。请直接针对这句话进行自然回复，开始对话。` : ''}`
          }
        });
        sessionPromiseRef.current = connectPromise;
        
        if (initialPrompt) {
            // Manually add the initial prompt to history since it was spoken before connection
            setHistory(prev => [...prev, {role: 'user', text: initialPrompt}]);
        }

        intervalId = window.setInterval(() => {
          if (!isSessionActive.current || !videoRef.current || !canvasRef.current) return;
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (video.readyState < 2 || video.videoWidth === 0) return;
          
          canvas.width = 320; 
          canvas.height = (video.videoHeight / video.videoWidth) * 320;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
            sessionPromiseRef.current?.then((session) => { session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }); });
          }
        }, 1000);

      } catch (err: any) { 
        setStatus('error'); 
        console.error("Init Failed", err);
      }
    };
    
    startCall();
    
    return () => {
      isSessionActive.current = false;
      window.clearInterval(intervalId);
      sessionPromiseRef.current?.then(session => session.close());
      if (audioContextRef.current) audioContextRef.current.close();
      if (inputCtxRef.current) inputCtxRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900 flex flex-col overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-70" />
      <canvas ref={canvasRef} className="hidden" />
      
      {!hasMic && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center gap-2">
            <span>🔇</span>
            <span>未检测到麦克风，小玲听不到您说话</span>
        </div>
      )}

      <div className="absolute right-4 bottom-44 z-20 flex flex-col items-center gap-2">
         <div className="w-6 h-40 bg-black/40 backdrop-blur-md rounded-full overflow-hidden border border-white/20 relative shadow-lg">
            <div 
               ref={volumeIndicatorRef}
               className="w-full absolute bottom-0 bg-green-400 transition-[height] duration-75 ease-linear shadow-[0_0_15px_rgba(74,222,128,0.6)]"
               style={{ height: '0%' }}
            />
         </div>
         <span className="text-white text-[10px] font-bold shadow-black drop-shadow-md bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">音量</span>
      </div>

      <div className="relative z-10 p-4 flex justify-between items-start mt-2">
        <button onClick={cycleCamera} className="bg-black/40 backdrop-blur-md border border-white/20 text-white rounded-full w-14 h-14 flex items-center justify-center active-scale"><span className="text-2xl">🔄</span></button>
        <div className={`px-6 py-2 rounded-full font-bold text-lg flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/20 ${status === 'active' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
          <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : status === 'error' ? 'bg-red-500' : 'bg-blue-500 animate-ping'}`}></div>
          {status === 'active' ? t('listening_user') : status === 'error' ? "设备连接失败" : t('coming')}
        </div>
        <button onClick={() => setShowHistory(true)} className="bg-black/40 backdrop-blur-md border border-white/20 text-white rounded-full w-14 h-14 flex items-center justify-center active-scale"><span className="text-2xl">📜</span></button>
      </div>
      
      <div className="relative z-10 mt-auto p-12 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-8">
        <div className="flex justify-center items-center gap-6">
          <button onClick={() => setIsMuted(!isMuted)} className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-3xl transition-all ${isMuted ? 'bg-red-500' : 'bg-white/20 backdrop-blur-md'}`}><span>{isMuted ? '🔇' : '🎤'}</span><span className="text-[10px] font-bold mt-1">{isMuted ? t('mute') : t('unmute')}</span></button>
          <button onClick={onEnd} className="w-32 h-32 bg-red-600 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-90 border-4 border-white/20"><span className="text-5xl">📞</span><span className="text-sm font-black mt-1">{t('end_call')}</span></button>
          <button onClick={handleStopTalking} className="w-20 h-20 bg-yellow-500 rounded-full flex flex-col items-center justify-center text-3xl shadow-xl"><span className="text-3xl">🤫</span><span className="text-[10px] font-black mt-1">{t('stop_talking')}</span></button>
        </div>
      </div>

      {showHistory && (
        <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col animate-bounce-in font-sans">
          <div className="bg-white p-4 shadow-sm flex items-center justify-between border-b border-slate-200">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span>📜</span> {t('history_title')}
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-500 text-3xl font-bold px-4">×</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <span className="text-6xl mb-4 opacity-50">💭</span>
                <p className="text-xl">{t('no_history')}</p>
              </div>
            ) : (
              history.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-slate-400 mb-1 px-2">{msg.role === 'user' ? '我' : '小玲'}</span>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-xl font-medium leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            
            {(inputTransRef.current || outputTransRef.current) && (
              <div className="opacity-50 flex flex-col gap-2">
                 {inputTransRef.current && <div className="self-end bg-blue-100 p-2 rounded-lg text-blue-800 text-sm">{t('listening_state')}: {inputTransRef.current}...</div>}
                 {outputTransRef.current && <div className="self-start bg-slate-100 p-2 rounded-lg text-slate-600 text-sm">{t('speaking_state')}: {outputTransRef.current}...</div>}
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <button 
              onClick={() => setHistory([])}
              className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl text-lg font-bold active-scale"
            >
              🗑️ {t('clear_history')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveCall;
