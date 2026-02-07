import React, { useRef, useState, useEffect } from 'react';
import { identifyPerson, playTTS } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

const Guardian: React.FC = () => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  const startCamera = async (index: number = 0) => {
    setError(null);
    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }

      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = availableDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);

      if (videoDevices.length === 0) {
        setError(t('camera_not_found'));
        return;
      }

      const constraints = { 
        video: { 
          deviceId: videoDevices[index]?.deviceId ? { exact: videoDevices[index].deviceId } : undefined,
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      };
      
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("Specific camera request failed, falling back to default.", err);
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Camera error:", err);
      setError(t('camera_open_fail'));
    }
  };

  useEffect(() => {
    startCamera(0);
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const switchCamera = () => {
    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);
    startCamera(nextIndex);
  };

  const handleIdentify = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setResult(null);

    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      const responseText = await identifyPerson(base64Image);
      setResult(responseText);
      await playTTS(responseText);
    }
    
    setIsAnalyzing(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-4">
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-blue-400">{t('ai_guard')}</h2>
          <p className="text-slate-400">{t('current_device')} {devices[currentDeviceIndex]?.label || t('default_camera')}</p>
        </div>
        {devices.length > 1 && (
          <button 
            onClick={switchCamera}
            className="bg-blue-600/20 border border-blue-500/50 px-4 py-2 rounded-full text-sm font-bold active-scale"
          >
            {t('change_lens')}
          </button>
        )}
      </div>

      <div className="relative flex-1 bg-black rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-inner flex items-center justify-center">
        {error ? (
          <div className="p-8 text-center bg-slate-800 rounded-3xl m-4">
            <p className="text-xl text-red-400 mb-6">{error}</p>
            <button onClick={() => startCamera(currentDeviceIndex)} className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold active-scale">
              {t('retry')}
            </button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        
        {isAnalyzing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-[scan_2s_infinite] shadow-[0_0_15px_#3b82f6]"></div>
            <div className="bg-blue-600/80 px-6 py-3 rounded-full text-xl font-bold animate-pulse">{t('ai_identifying')}</div>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-4 bg-white text-slate-800 p-6 rounded-[30px] animate-bounce-in shadow-xl">
          <p className="text-xl leading-relaxed">{result}</p>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={handleIdentify}
          disabled={isAnalyzing || !!error}
          className={`w-full py-8 rounded-[40px] text-3xl font-black flex items-center justify-center gap-4 active-scale transition-all ${
            isAnalyzing ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500'
          } ${!!error ? 'opacity-50' : ''}`}
        >
          {isAnalyzing ? t('please_wait') : t('who_at_door')}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <style>{` @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } } `}</style>
    </div>
  );
};

export default Guardian;