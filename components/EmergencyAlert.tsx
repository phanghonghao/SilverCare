
import React, { useState, useEffect } from 'react';
import { playTTS } from '../services/geminiService';

interface EmergencyAlertProps {
  onCancel: () => void;
}

const EmergencyAlert: React.FC<EmergencyAlertProps> = ({ onCancel }) => {
  const [countdown, setCountdown] = useState(3);
  const [isCalling, setIsCalling] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [emergencyPhone, setEmergencyPhone] = useState("666"); // 默認值

  useEffect(() => {
    // 優先讀取緊急號碼
    const savedEmergency = localStorage.getItem('SILVERCARE_EMERGENCY_PHONE');
    const savedFamily = localStorage.getItem('SILVERCARE_FAMILY_PHONE');
    
    if (savedEmergency) {
      setEmergencyPhone(savedEmergency);
    } else if (savedFamily) {
      setEmergencyPhone(savedFamily);
    }

    // 强制获取位置
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
            setLocError("位置暂时不可用");
          },
          { enableHighAccuracy: true, timeout: 4000 }
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

    playTTS("发现摔倒！张爷爷，您还好吗？小玲正在为您呼叫救援。");

    return () => clearInterval(timer);
  }, []);

  const startEmergencyCall = () => {
    setIsCalling(true);
    
    // 触发安卓原生拨号，使用讀取到的號碼
    try {
      window.location.href = `tel:${emergencyPhone}`;
    } catch (e) {
      console.error("Dialer failed", e);
    }
    
    const locStr = location 
      ? `位置在北纬${location.lat.toFixed(4)}，东经${location.lng.toFixed(4)}`
      : "目前无法定位到具体经纬度";
    
    playTTS(`报警中。内容：张爷爷在刚才发生了疑似跌倒，${locStr}，请速查！`);
  };

  if (isCalling) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-40 h-40 bg-blue-500 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_80px_rgba(59,130,246,0.6)]">
          <span className="text-7xl">📞</span>
        </div>
        <h2 className="text-5xl font-black mb-4">呼救已发出</h2>
        <p className="text-2xl text-blue-400 mb-10">呼叫中：{emergencyPhone}</p>
        
        <div className="bg-white/10 p-8 rounded-[40px] mb-10 w-full text-left backdrop-blur-md border border-white/20">
          <h4 className="text-sm text-blue-300 mb-4 uppercase font-black tracking-widest">救援任务简报：</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <p className="text-xl">拨号盘已激活</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <p className="text-xl">
                {location ? `位置信息已锁定 (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : locError || '正在努力重试定位...'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full">
          <button 
            onClick={() => window.location.href = `tel:${emergencyPhone}`}
            className="bg-blue-600 w-full py-8 rounded-[30px] text-3xl font-black shadow-2xl active-scale"
          >
            再次点击拨号
          </button>
          <button 
            onClick={onCancel}
            className="bg-slate-800 w-full py-5 rounded-[30px] text-2xl font-bold active-scale border border-white/10"
          >
            我安全了，返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-around p-8 text-white animate-[pulse-red_0.8s_infinite] text-center">
      <div>
        <div className="text-[120px] mb-6 drop-shadow-2xl">⚠️</div>
        <h2 className="text-6xl font-black mb-6 tracking-tight">检测到您摔倒了！</h2>
        <p className="text-3xl opacity-90 font-medium">如果您没事，请立刻点击下方取消</p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full">
        <p className="text-4xl font-black">{countdown} 秒后自动呼叫</p>
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
        我没事
      </button>

      <style>{`
        @keyframes pulse-red {
          0% { background-color: #b91c1c; }
          50% { background-color: #ef4444; }
          100% { background-color: #b91c1c; }
        }
      `}</style>
    </div>
  );
};

export default EmergencyAlert;
