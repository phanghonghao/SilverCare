
import React, { useRef, useState, useEffect } from 'react';
import { playTTS, addSafetyLog } from '../services/geminiService';
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
  
  // 状态机：preview (预览) -> recording (录制中) -> processing (保存中) -> success (完成)
  const [status, setStatus] = useState<'preview' | 'recording' | 'processing' | 'success'>('preview');
  const [countdown, setCountdown] = useState(5);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 初始化摄像头
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera Error:", err);
        // 如果摄像头失败，依然允许进入，只是黑屏，防止卡死
        playTTS("摄像头启动遇到问题，但仍可尝试记录。");
      }
    };
    startCamera();

    if (isForced) {
      setTimeout(() => playTTS(`请拍摄${medName}，点击按钮开始5秒录像。`), 500);
    }

    return () => {
      // 清理资源
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isForced, medName]);

  // 倒计时逻辑
  useEffect(() => {
    let timer: number;
    if (status === 'recording') {
      if (countdown > 0) {
        timer = window.setTimeout(() => setCountdown(c => c - 1), 1000);
      } else {
        // 倒计时结束，停止录制
        stopRecording();
      }
    }
    return () => clearTimeout(timer);
  }, [status, countdown]);

  const handleStart = () => {
    // 1. 先截图作为封面
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      const ctx = canvasRef.current.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      try {
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
        setCapturedImage(base64);
      } catch (e) {
        console.error("Capture image failed", e);
      }
    }

    // 2. 开始录像
    setCountdown(5);
    setStatus('recording');
    playTTS("开始录制。");
    
    if (streamRef.current) {
      recordedChunks.current = [];
      try {
        const mimeTypes = [
            'video/webm;codecs=vp8', 
            'video/webm', 
            'video/mp4'
        ];
        const validType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
        
        const recorder = new MediaRecorder(streamRef.current, validType ? { mimeType: validType } : undefined);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.current.push(e.data);
        };

        recorder.onstop = async () => {
          // 正常停止回调
          finishProcess();
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
      } catch (e) {
        console.error("Recorder init failed", e);
        // 如果录制启动失败，直接倒计时结束后按只有图片处理
      }
    }
  };

  const stopRecording = () => {
    setStatus('processing'); // 进入处理状态，显示 Spinner
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        finishProcess(); // 停止失败直接完成
      }
    } else {
      finishProcess(); // 如果没有录制实例，直接完成
    }

    // 安全网：如果 2秒后还没完成（比如 onstop 没触发），强制完成
    setTimeout(() => {
      finishProcess(); 
    }, 2000);
  };

  // 最终完成逻辑（防抖，只执行一次）
  const hasFinishedRef = useRef(false);
  const finishProcess = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // 构建视频数据
    let videoDataStr: string | undefined = undefined;
    if (recordedChunks.current.length > 0) {
      try {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const res = reader.result as string;
            saveAndExit(res.split(',')[1]);
        };
        return; // 等待读取完成
      } catch (e) {
        console.error("Blob processing failed", e);
      }
    }
    
    // 如果没有视频或读取失败，只保存图片
    saveAndExit(undefined);
  };

  const saveAndExit = (videoBase64?: string) => {
    setStatus('success');
    
    const record: MedRecord = {
      id: Date.now().toString(),
      medName,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      evidenceImage: capturedImage || '',
      videoData: videoBase64,
      status: 'verified',
      isVideoUploaded: !!videoBase64
    };
    
    // 保存到本地
    const existing = JSON.parse(localStorage.getItem('SILVERCARE_MED_LOGS') || '[]');
    const newLogs = [record, ...existing].slice(0, 10);
    localStorage.setItem('SILVERCARE_MED_LOGS', JSON.stringify(newLogs));
    
    addSafetyLog({
      id: Date.now().toString(),
      type: 'med_done',
      timestamp: Date.now(),
      detail: `✅ ${medName} (5秒视频)`,
      statusText: '存证完成'
    });

    playTTS(`录制完成，已发送。`);
    
    setTimeout(() => {
      onComplete(record);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col p-6 text-white text-center">
      <div className="mb-4">
        <h2 className="text-3xl font-black">
          {status === 'preview' && "准备录制"}
          {status === 'recording' && "正在录像..."}
          {status === 'processing' && "正在保存..."}
          {status === 'success' && "完成！"}
        </h2>
        <p className="text-blue-400 text-xl font-bold">💊 {medName}</p>
      </div>

      <div className="relative flex-1 bg-slate-900 rounded-[50px] overflow-hidden border-4 border-blue-500 shadow-2xl">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        
        {/* 录制时的覆盖层 */}
        {status === 'recording' && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-mono text-white font-bold tracking-wider">REC</span>
          </div>
        )}

        {/* 倒计时大数字 */}
        {status === 'recording' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/20">
               <span className="text-8xl font-black text-white drop-shadow-lg font-mono">{countdown}</span>
            </div>
          </div>
        )}

        {/* 处理中遮罩 */}
        {status === 'processing' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-20">
            <div className="w-20 h-20 border-8 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xl font-bold">正在保存视频...</p>
          </div>
        )}
      </div>

      <div className="mt-8 h-24">
        {status === 'preview' && (
          <button 
            onClick={handleStart}
            className="w-full h-full bg-red-600 rounded-[40px] text-3xl font-black shadow-xl active:scale-95 transition-all border-b-8 border-red-800 flex items-center justify-center gap-3"
          >
            <div className="w-6 h-6 bg-white rounded-full"></div>
            <span>开始录制 (5秒)</span>
          </button>
        )}
        
        {status === 'recording' && (
          <div className="w-full h-full bg-slate-800 rounded-[40px] flex items-center justify-center border-2 border-slate-700">
             <p className="text-slate-400 font-bold animate-pulse">请展示药盒与服药动作</p>
          </div>
        )}
      </div>
      
      {/* 隐藏的 Canvas 用于截图 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MedicationCapture;
