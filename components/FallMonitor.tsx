
import React, { useState, useEffect, useRef } from 'react';
import { SensorData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { playTTS, stopTTS, addSafetyLog, DataSyncManager } from '../services/geminiService';

interface FallMonitorProps {
  onFallDetected: () => void;
  onBack: () => void;
}

enum DetectionState {
  IDLE,
  POTENTIAL_FALL, // 疑似失重
  IMPACT_DETECTED, // 检测到撞击
  MONITORING_STILLNESS, // 正在观察静止
}

const FallMonitor: React.FC<FallMonitorProps> = ({ onFallDetected, onBack }) => {
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [accel, setAccel] = useState<SensorData>({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const detectionState = useRef<DetectionState>(DetectionState.IDLE);
  const lastStateChange = useRef<number>(0);
  const wakeLock = useRef<any>(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLock.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) { console.warn("WakeLock request failed", err); }
    }
  };

  const stopMonitoring = () => {
    setIsActive(false);
    if (wakeLock.current) { wakeLock.current.release(); wakeLock.current = null; }
    detectionState.current = DetectionState.IDLE;
    // 停止时同步状态
    DataSyncManager.pushStatus({ is_falling: false });
  };

  const startMonitoring = async () => {
    setError(null);
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') { setIsActive(true); await requestWakeLock(); }
        else { setError(t('permission_denied')); }
      } catch (e) { setError(t('req_perm_fail')); }
    } else {
      setIsActive(true);
      await requestWakeLock();
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const handleMotion = (event: DeviceMotionEvent) => {
      const ag = event.accelerationIncludingGravity;
      if (!ag) return;
      const nx = ag.x || 0; const ny = ag.y || 0; const nz = ag.z || 0;
      const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const now = Date.now();
      setAccel({ x: nx, y: ny, z: nz, magnitude: mag });

      switch (detectionState.current) {
        case DetectionState.IDLE:
          if (mag < 3.5) { detectionState.current = DetectionState.POTENTIAL_FALL; lastStateChange.current = now; }
          break;
        case DetectionState.POTENTIAL_FALL:
          if (now - lastStateChange.current < 500) {
            if (mag > 28) { detectionState.current = DetectionState.IMPACT_DETECTED; lastStateChange.current = now; if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
          } else { detectionState.current = DetectionState.IDLE; }
          break;
        case DetectionState.IMPACT_DETECTED:
          if (now - lastStateChange.current > 1000) {
            detectionState.current = DetectionState.MONITORING_STILLNESS; lastStateChange.current = now;
            playTTS("检测到您摔了一下，您还好吗？");
            // 同步疑似跌倒状态至云端，子女端会收到初步预警
            DataSyncManager.pushStatus({ is_falling: true, user_status: 'intense' });
          }
          break;
        case DetectionState.MONITORING_STILLNESS:
          if (Math.abs(mag - 9.8) > 3.0) {
            detectionState.current = DetectionState.IDLE; stopTTS();
            playTTS("检测到您已恢复活动。");
            DataSyncManager.pushStatus({ is_falling: false, user_status: 'walking' });
          } else if (now - lastStateChange.current > 6000) {
            detectionState.current = DetectionState.IDLE;
            triggerAlert();
          }
          break;
      }
    };
    window.addEventListener('devicemotion', handleMotion, true);
    return () => window.removeEventListener('devicemotion', handleMotion, true);
  }, [isActive]);

  const triggerAlert = () => {
    addSafetyLog({ id: Date.now().toString(), type: 'fall', timestamp: Date.now(), detail: "检测到剧烈撞击且长时间静止", statusText: "紧急求助已发起" });
    // 推送最高级别云端警报
    DataSyncManager.pushStatus({ is_falling: true, user_status: 'intense' });
    onFallDetected();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold text-slate-800">{t('monitor_title')}</h2>
        <button 
          onClick={onBack}
          className="bg-slate-100 px-6 py-2 rounded-full font-bold text-slate-600 active-scale"
        >
          {t('back')}
        </button>
      </div>
      <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">🛡️</div>
        <p className="flex-1 text-lg text-slate-500 font-bold leading-tight">{isActive ? t('monitor_active_24h') : t('monitor_desc_detail')}</p>
      </div>
      {error && <div className="bg-red-50 text-red-600 p-6 rounded-3xl border-2 border-red-100 font-bold text-center animate-shake">⚠️ {error}</div>}
      {!isActive ? (
        <button onClick={startMonitoring} className="w-full bg-blue-600 rounded-[50px] p-12 text-center shadow-xl active-scale transition-all border-b-8 border-blue-800">
          <div className="text-8xl mb-6">🔔</div>
          <h3 className="text-4xl font-black text-white mb-2">{t('start_monitor')}</h3>
          <p className="text-blue-100 text-xl font-bold">{t('click_protect')}</p>
        </button>
      ) : (
        <div className="space-y-6">
          <div className="bg-emerald-600 rounded-[50px] p-10 text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-8xl mb-4 animate-bounce">🛡️</div>
              <h3 className="text-4xl font-black text-white mb-2">{t('guarding')}</h3>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                  <p className="text-xs text-emerald-200 uppercase font-black tracking-widest mb-1">{t('gravity_sensor')}</p>
                  <p className="text-4xl font-black text-white">{accel.magnitude.toFixed(1)} <span className="text-sm">g</span></p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                  <p className="text-xs text-emerald-200 uppercase font-black tracking-widest mb-1">{t('safe_status')}</p>
                  <p className="text-2xl font-black text-emerald-300">{accel.magnitude > 22 ? t('abnormal') : t('normal')}</p>
                </div>
              </div>
            </div>
          </div>
          <button onClick={stopMonitoring} className="w-full bg-slate-200 text-slate-500 py-6 rounded-[35px] text-xl font-black active-scale">{t('stop_monitor')}</button>
          <div className="p-6 bg-amber-50 rounded-3xl border-2 border-dashed border-amber-200">
             <h4 className="text-amber-800 font-bold mb-3 text-center">{t('test_mode')}</h4>
             <button onClick={() => { detectionState.current = DetectionState.POTENTIAL_FALL; lastStateChange.current = Date.now(); setTimeout(() => setAccel({ x: 0, y: 0, z: 0, magnitude: 35 }), 100); }} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg">{t('sim_impact')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FallMonitor;
    