import React, { useRef, useState, useEffect } from 'react';
import { analyzeUserRole, playTTS } from '../services/geminiService';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface RoleDetectionProps {
  onRoleDetected: (role: UserRole) => void;
}

const RoleDetection: React.FC<RoleDetectionProps> = ({ onRoleDetected }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [showOverride, setShowOverride] = useState(false);

  const initCamera = async (deviceIndex: number = 0) => {
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
          // 当使用 deviceId 时，不应同时指定 facingMode
          deviceId: videoDevices[deviceIndex]?.deviceId ? { exact: videoDevices[deviceIndex].deviceId } : undefined
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Specific camera constraint failed, fallback to default", e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      console.error(e);
      setError(t('camera_auth_error'));
    }
  };

  useEffect(() => {
    initCamera(0);
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  const switchCamera = () => {
    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);
    initCamera(nextIndex);
  };

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;
    setIsScanning(true);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      const result = await analyzeUserRole(base64);
      if (result.role === 'elderly') {
        await playTTS("识别成功。爷爷奶奶您好，正在为您开启长者关怀模式。"); // Keeping TTS simple for now or move to context if strictly needed, but TTS is often language specific in service logic. 
        onRoleDetected(UserRole.ELDERLY);
      } else {
        onRoleDetected(UserRole.CHILD);
      }
    }
    setIsScanning(false);
  };

  const handleManualRole = (role: UserRole) => {
    onRoleDetected(role);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 items-center justify-center p-8 text-center relative">
      <div className="mb-6">
        <h2 className="text-4xl font-black text-white mb-4">{t('role_title')}</h2>
        <p className="text-slate-400 text-lg leading-relaxed">
          {t('role_desc')}
        </p>
      </div>

      <div className="relative w-full aspect-square max-w-sm rounded-[60px] overflow-hidden border-4 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-slate-900">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[0.5]" />
        
        {devices.length > 1 && (
          <button 
            onClick={switchCamera}
            className="absolute bottom-6 right-6 bg-white/20 backdrop-blur-md p-4 rounded-full text-white active-scale border border-white/20 z-20"
          >
            {t('switch_camera')}
          </button>
        )}

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500/50 shadow-[0_0_15px_#3b82f6] animate-[scan_3s_infinite]"></div>
        </div>

        {isScanning && (
          <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center backdrop-blur-sm z-30">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 mt-6 font-bold">{error}</p>}

      <div className="mt-12 w-full max-w-sm space-y-4">
        <button 
          onClick={handleScan}
          disabled={isScanning}
          className="w-full bg-blue-600 text-white py-6 rounded-[35px] text-2xl font-black shadow-xl active-scale"
        >
          {isScanning ? t('scanning') : t('start_auto_config')}
        </button>

        <button 
          onClick={() => setShowOverride(!showOverride)}
          className="text-slate-500 text-sm font-bold underline"
        >
          {t('manual_select')}
        </button>

        {showOverride && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            <button 
              onClick={() => handleManualRole(UserRole.ELDERLY)}
              className="bg-slate-800 text-white py-4 rounded-2xl font-black border border-slate-700 active-scale"
            >
              {t('iam_elderly')}
            </button>
            <button 
              onClick={() => handleManualRole(UserRole.CHILD)}
              className="bg-slate-800 text-white py-4 rounded-2xl font-black border border-slate-700 active-scale"
            >
              {t('iam_child')}
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* 调试模式快捷键 */}
      <div 
        className="absolute top-0 left-0 right-0 h-20 opacity-0"
        onContextMenu={(e) => { e.preventDefault(); handleManualRole(UserRole.ELDERLY); }}
      ></div>

      <style>{`
        @keyframes scan { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default RoleDetection;