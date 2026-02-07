import React, { useRef, useState, useEffect } from 'react';
import { explainEverything, playTTS } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface VisionAssistantProps {
  voiceSwitchTrigger?: number; 
  onBack: () => void;
}

const VisionAssistant: React.FC<VisionAssistantProps> = ({ voiceSwitchTrigger, onBack }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  const startCamera = async (index: number = 0) => {
    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      
      const constraints = { 
        video: { 
          deviceId: videoDevices[index]?.deviceId ? { exact: videoDevices[index].deviceId } : undefined
        } 
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Specific device failed, falling back to default.", e);
        // Fallback to any camera if specific device fails (e.g. unplugged)
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
      console.error(err);
      // alert(t('camera_error')); // Suppress alert for better UX, or show in UI
    }
  };

  useEffect(() => {
    startCamera(currentDeviceIndex);
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [currentDeviceIndex]);

  useEffect(() => {
    if (voiceSwitchTrigger !== undefined && voiceSwitchTrigger > 0) switchCamera();
  }, [voiceSwitchTrigger]);

  const switchCamera = () => {
    if (devices.length <= 1) return;
    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      const text = await explainEverything(base64Image);
      setResult(text);
      await playTTS(text);
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 space-y-4">
      <div className="text-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('vision_title')}</h2>
          <p className="text-slate-400 text-xs">{devices[currentDeviceIndex]?.label || "环境识别模式"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={switchCamera} className="bg-blue-500/20 px-4 py-2 rounded-full border border-blue-500/30 text-xs text-blue-400 font-bold active-scale">
            🔄 切换
          </button>
          <button 
            onClick={onBack}
            className="bg-slate-800 px-6 py-2 rounded-full font-bold text-slate-300 border border-slate-700 active-scale"
          >
            {t('back')}
          </button>
        </div>
      </div>
      <div className="relative flex-1 bg-black rounded-[40px] overflow-hidden border-4 border-slate-700">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {isAnalyzing && (
          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><div className="w-20 h-20 border-8 border-white border-t-transparent rounded-full animate-spin"></div></div>
        )}
      </div>
      {result && (
        <div className="bg-white p-6 rounded-[30px] shadow-2xl animate-bounce-in max-h-[60vh] overflow-y-auto border-2 border-slate-100">
           <h3 className="text-lg font-black text-blue-600 mb-2">🔍 小玲识别结果：</h3>
           <p className="text-xl leading-relaxed text-slate-800 whitespace-pre-wrap font-medium">{result}</p>
        </div>
      )}
      <button onClick={handleCapture} disabled={isAnalyzing} className="bg-emerald-600 text-white py-8 rounded-[40px] text-3xl font-black shadow-lg active-scale">{isAnalyzing ? t('analyzing') : t('take_photo')}</button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VisionAssistant;