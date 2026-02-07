import React, { useRef, useState, useEffect } from 'react';
import { verifyMedication, playTTS, addSafetyLog } from '../services/geminiService';
import { MedRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MedicationCaptureProps {
  medName: string;
  isForced?: boolean;
  onComplete: (record: MedRecord) => void;
  onCancel: () => void;
}

const MedicationCapture: React.FC<MedicationCaptureProps> = ({ medName, isForced = false, onComplete, onCancel }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<'scan' | 'recording' | 'uploading' | 'success'>('scan');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const initCamera = async () => {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
      } catch (err) {
        // 降级：如果找不到前置摄像头，则请求默认摄像头
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) { 
      console.error(e);
      playTTS("镜头启动失败。");
    }
  };

  useEffect(() => {
    initCamera();
    if (isForced) {
      setTimeout(() => {
        playTTS(`请拍${medName}，核对用药。`);
      }, 500);
    }
    return () => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); };
  }, [isForced]);

  const handleVerify = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      const result = await verifyMedication(base64, medName);
      if (result.verified) {
        setStep('recording');
        playTTS("识别成功。请喝药，正在录制。");
        startRecordingCountdown(base64);
      } else {
        playTTS("没看清，请靠近。");
      }
    }
    setIsAnalyzing(false);
  };

  const startRecordingCountdown = (initialImg: string) => {
    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        finalizeMedication(initialImg);
      }
    }, 1000);
  };

  const finalizeMedication = (img: string) => {
    setStep('success');
    const record: MedRecord = {
      id: Date.now().toString(),
      medName,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      evidenceImage: img,
      status: 'verified',
      isVideoUploaded: true
    };
    
    const existing = JSON.parse(localStorage.getItem('SILVERCARE_MED_LOGS') || '[]');
    localStorage.setItem('SILVERCARE_MED_LOGS', JSON.stringify([record, ...existing]));
    
    addSafetyLog({
      id: Date.now().toString(),
      type: 'med_done',
      timestamp: Date.now(),
      detail: `✅ ${medName}`,
      statusText: '存证完成'
    });

    playTTS(`吃完啦，真棒！`);
    
    setTimeout(() => {
      onComplete(record);
    }, 2000);
  };

  const getTitle = () => {
    if (step === 'scan') return t('verify_step');
    if (step === 'recording') return t('recording_step');
    return t('syncing_step');
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col p-6 text-white text-center">
      <div className="mb-4">
        <h2 className="text-3xl font-black">{getTitle()}</h2>
        <p className="text-blue-400 text-xl font-bold">💊 {medName}</p>
      </div>

      <div className="relative flex-1 bg-slate-900 rounded-[50px] overflow-hidden border-4 border-blue-500">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {step === 'recording' && (
          <div className="absolute inset-0 bg-red-600/20 flex flex-col items-center justify-center">
            <div className="w-40 h-40 bg-red-600 rounded-full flex items-center justify-center text-7xl font-black border-8 border-white">
              {countdown}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        {step === 'scan' && (
          <button 
            onClick={handleVerify}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 py-8 rounded-[40px] text-4xl font-black shadow-2xl active-scale"
          >
            {isAnalyzing ? "..." : t('click_verify')}
          </button>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MedicationCapture;