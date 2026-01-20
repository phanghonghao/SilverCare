
import React, { useRef, useState, useEffect } from 'react';
import { identifyPerson, playTTS } from '../services/geminiService';

const Guardian: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 1280, height: 720 } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setResult("无法连接摄像头，请检查权限。");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleIdentify = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setResult(null);

    // Capture frame
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
      <div className="mb-4">
        <h2 className="text-3xl font-bold">AI 守卫</h2>
        <p className="text-slate-400">正在帮您看守家门</p>
      </div>

      {/* Video Preview Container */}
      <div className="relative flex-1 bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-inner">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        
        {/* Scanning Animation Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-10">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-[scan_2s_infinite] shadow-[0_0_15px_#3b82f6]"></div>
            <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px]"></div>
          </div>
        )}

        {/* HUD Elements */}
        <div className="absolute top-4 left-4 border-l-2 border-t-2 border-white/50 w-8 h-8"></div>
        <div className="absolute top-4 right-4 border-r-2 border-t-2 border-white/50 w-8 h-8"></div>
        <div className="absolute bottom-4 left-4 border-l-2 border-b-2 border-white/50 w-8 h-8"></div>
        <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-white/50 w-8 h-8"></div>
      </div>

      {/* Identification Result */}
      {result && (
        <div className="mt-4 bg-white text-slate-800 p-6 rounded-3xl animate-bounce-in shadow-xl">
          <p className="text-2xl font-bold text-blue-600 mb-2">识别结果：</p>
          <p className="text-xl leading-relaxed">{result}</p>
        </div>
      )}

      {/* Control Area */}
      <div className="mt-6 flex flex-col gap-4">
        <button
          onClick={handleIdentify}
          disabled={isAnalyzing}
          className={`w-full py-8 rounded-3xl text-3xl font-bold flex items-center justify-center gap-4 active-scale transition-all ${
            isAnalyzing ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              辨认中...
            </>
          ) : (
            <>
              <span>🔍</span> 门外是谁？
            </>
          )}
        </button>
        <p className="text-center text-slate-500 text-lg">点击大按钮，让我帮您看看门口的人</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-bounce-in {
          animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Guardian;
