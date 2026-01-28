
import React, { useRef, useState, useEffect } from 'react';
import { explainEverything, playTTS } from '../services/geminiService';

const VisionAssistant: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        // environment 明确调用系统后置摄像头
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { 
        alert("摄像头无法访问。请确保已在首页完成权限开启。"); 
      }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

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
      <div className="text-white flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">帮我看看</h2>
          <p className="text-slate-400">小玲帮您识别物品和文字</p>
        </div>
        <div className="bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30 text-xs text-blue-400">后置镜头</div>
      </div>

      <div className="relative flex-1 bg-black rounded-[40px] overflow-hidden border-4 border-slate-700">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {isAnalyzing && (
          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
             <div className="w-20 h-20 border-8 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white p-6 rounded-[30px] shadow-2xl animate-bounce-in max-h-40 overflow-y-auto">
          <p className="text-xl leading-relaxed text-slate-800">{result}</p>
        </div>
      )}

      <button
        onClick={handleCapture}
        disabled={isAnalyzing}
        className="bg-emerald-600 text-white py-10 rounded-[40px] text-4xl font-black shadow-lg active-scale"
      >
        {isAnalyzing ? '正在辨认...' : '📷 拍一下'}
      </button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VisionAssistant;
