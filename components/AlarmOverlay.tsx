
import React, { useEffect } from 'react';
import { playTTS } from '../services/geminiService';
import { Alarm } from '../types';

interface AlarmOverlayProps {
  alarm: Alarm;
  onDismiss: () => void;
}

const AlarmOverlay: React.FC<AlarmOverlayProps> = ({ alarm, onDismiss }) => {
  useEffect(() => {
    const playAlert = async () => {
      await playTTS(`张爷爷，现在是${alarm.time}，您的${alarm.label}闹钟响啦。请注意休息，活动一下身体。`);
    };
    playAlert();
    
    // 自动重播
    const interval = setInterval(playAlert, 15000);
    return () => clearInterval(interval);
  }, [alarm]);

  return (
    <div className="fixed inset-0 z-[200] bg-blue-600 flex flex-col items-center justify-center p-8 text-white text-center">
      <div className="relative mb-12">
        <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center animate-ping absolute inset-0"></div>
        <div className="w-48 h-48 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-2xl relative z-10">
          <span className="text-8xl animate-bounce">⏰</span>
        </div>
      </div>

      <h2 className="text-5xl font-black mb-4">闹钟响了！</h2>
      <p className="text-3xl font-bold mb-2 opacity-90">{alarm.label}</p>
      <p className="text-8xl font-bold mb-16 font-time">
        {alarm.time}
      </p>

      <button
        onClick={onDismiss}
        className="w-full max-w-sm bg-white text-blue-600 py-10 rounded-[50px] text-5xl font-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] active-scale transition-transform"
      >
        我知道了
      </button>

      <div className="mt-12 flex items-center gap-3 bg-white/10 px-6 py-3 rounded-full">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        <p className="text-xl font-medium">小玲正在提醒您...</p>
      </div>
    </div>
  );
};

export default AlarmOverlay;
