
import React, { useEffect } from 'react';
import { playTTS } from '../services/geminiService';
import { Alarm } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AlarmOverlayProps {
  alarm: Alarm;
  onDismiss: () => void;
}

const AlarmOverlay: React.FC<AlarmOverlayProps> = ({ alarm, onDismiss }) => {
  const { t } = useLanguage();
  const isMed = alarm.label.includes('药') || alarm.label.toLowerCase().includes('med');

  useEffect(() => {
    const playAlert = async () => {
      await playTTS(`${alarm.time} ${alarm.label}`);
    };
    playAlert();
    const interval = setInterval(playAlert, 15000);
    return () => clearInterval(interval);
  }, [alarm]);

  return (
    <div className="fixed inset-0 z-[200] bg-blue-600 flex flex-col items-center justify-center p-8 text-white text-center">
      <div className="relative mb-12">
        <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center animate-ping absolute inset-0"></div>
        <div className="w-48 h-48 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-2xl relative z-10">
          <span className="text-8xl animate-bounce">{isMed ? '💊' : '⏰'}</span>
        </div>
      </div>

      <h2 className="text-5xl font-black mb-4">{isMed ? t('med_alarm_ringing') : t('alarm_ringing')}</h2>
      <p className="text-3xl font-bold mb-2 opacity-90">{alarm.label}</p>
      <p className="text-8xl font-bold mb-16 font-time">{alarm.time}</p>

      <div className="flex flex-col gap-6 w-full max-w-sm">
        {isMed ? (
          <button
            onClick={onDismiss}
            className="w-full bg-emerald-500 text-white py-10 rounded-[50px] text-4xl font-black shadow-xl active-scale border-4 border-white animate-bounce"
          >
            {t('verify_take_med')}
          </button>
        ) : (
          <button
            onClick={onDismiss}
            className="w-full bg-white text-blue-600 py-10 rounded-[50px] text-5xl font-black shadow-xl active-scale"
          >
            {t('dismiss_btn')}
          </button>
        )}
        
        <button onClick={onDismiss} className="text-white/60 font-bold text-xl">{t('snooze')}</button>
      </div>

      <div className="mt-12 flex items-center gap-3 bg-white/10 px-6 py-3 rounded-full">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        <p className="text-xl font-medium">{t('alarm_reminding')}</p>
      </div>
    </div>
  );
};

export default AlarmOverlay;
    