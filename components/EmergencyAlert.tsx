
import React, { useState, useEffect } from 'react';
import { playTTS } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface EmergencyAlertProps {
  onCancel: () => void;
}

const EmergencyAlert: React.FC<EmergencyAlertProps> = ({ onCancel }) => {
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(3);
  const [isCalling, setIsCalling] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [emergencyPhone, setEmergencyPhone] = useState("120"); // 默认急救电话

  useEffect(() => {
    // 优先读取本地设置的紧急号码
    const savedEmergency = localStorage.getItem('SILVERCARE_EMERGENCY_PHONE');
    const savedFamily = localStorage.getItem('SILVERCARE_FAMILY_PHONE');
    
    if (savedEmergency) {
      setEmergencyPhone(savedEmergency);
    } else if (savedFamily) {
      setEmergencyPhone(savedFamily);
    }

    // 获取当前精确位置
    const fetchLoc = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error("Position failed", error);
            setLocError(t('loc_fail'));
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    };

    fetchLoc();

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          startEmergencyCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    playTTS(t('fall_alert') + " " + t('countdown_msg'));

    return () => clearInterval(timer);
  }, [t]);

  const startEmergencyCall = () => {
    setIsCalling(true);
    
    // 跳转到拨号盘
    try {
      window.location.href = `tel:${emergencyPhone}`;
    } catch (e) {
      console.error("Dialer failed", e);
    }
    
    // playTTS logic can be simple or generic
    playTTS(t('calling_screen'));
  };

  if (isCalling) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-40 h-40 bg-red-600 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_80px_rgba(220,38,38,0.6)]">
          <span className="text-7xl">📞</span>
        </div>
        <h2 className="text-5xl font-black mb-4">{t('calling_screen')}</h2>
        <p className="text-2xl text-red-400 mb-10 font-bold tracking-widest">{emergencyPhone}</p>
        
        <div className="bg-white/10 p-8 rounded-[40px] mb-10 w-full text-left backdrop-blur-md border border-white/20">
          <h4 className="text-sm text-red-300 mb-4 uppercase font-black tracking-widest">STATUS:</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <p className="text-xl">{t('trigger_dial')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <p className="text-xl">
                {location ? `(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : locError || t('locating')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full">
          <button 
            onClick={() => window.location.href = `tel:${emergencyPhone}`}
            className="bg-red-600 w-full py-8 rounded-[30px] text-3xl font-black shadow-2xl active-scale"
          >
            {t('redial')}
          </button>
          <button 
            onClick={onCancel}
            className="bg-slate-800 w-full py-5 rounded-[30px] text-2xl font-bold active-scale border border-white/10"
          >
            {t('false_alarm')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-around p-8 text-white animate-[pulse-red_0.8s_infinite] text-center">
      <div>
        <div className="text-[120px] mb-6 drop-shadow-2xl">🚑</div>
        <h2 className="text-6xl font-black mb-6 tracking-tight leading-tight">{t('fall_alert')}</h2>
        <p className="text-3xl opacity-90 font-medium">{t('countdown_msg')}</p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full">
        <p className="text-6xl font-black">{countdown}</p>
        <div className="w-full max-w-sm h-6 bg-white/30 rounded-full overflow-hidden border-2 border-white/20">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-linear shadow-[0_0_15px_white]"
            style={{ width: `${(countdown / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="w-full max-w-sm bg-white text-red-600 py-12 rounded-[50px] text-5xl font-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] active-scale transition-transform"
      >
        {t('cancel_fine')}
      </button>

      <style>{`
        @keyframes pulse-red {
          0% { background-color: #991b1b; }
          50% { background-color: #ef4444; }
          100% { background-color: #991b1b; }
        }
      `}</style>
    </div>
  );
};

export default EmergencyAlert;
