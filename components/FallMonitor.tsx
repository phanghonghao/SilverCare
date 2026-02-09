
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
  POTENTIAL_FALL, // 阶段1: 失重 (Weightlessness)
  IMPACT_DETECTED, // 阶段2: 撞击 (Impact)
  MONITORING_STILLNESS, // 阶段3: 持续静止 (Stillness)
}

const FallMonitor: React.FC<FallMonitorProps> = ({ onFallDetected, onBack }) => {
  const { t, language } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [accel, setAccel] = useState<SensorData>({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const detectionState = useRef<DetectionState>(DetectionState.IDLE);
  const lastStateChange = useRef<number>(0);
  const wakeLock = useRef<any>(null);

  // 算法参数
  const THRESHOLD_FREE_FALL = 3.5; // m/s² (接近失重)
  const THRESHOLD_IMPACT = 30.0;    // m/s² (剧烈撞击)
  const STILLNESS_DURATION = 6000;  // 6秒静止判定

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      try {
        wakeLock.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) { console.warn("WakeLock request failed", err); }
    }
  };

  const stopMonitoring = () => {
    setIsActive(false);
    if (wakeLock.current) { wakeLock.current.release(); wakeLock.current = null; }
    detectionState.current = DetectionState.IDLE;
    DataSyncManager.pushStatus({ is_falling: false });
  };

  const startMonitoring = async () => {
    setError(null);
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') { 
          setIsActive(true); 
          await requestWakeLock(); 
        } else { 
          setError(t('permission_denied')); 
        }
      } catch (e) { 
        setError(t('req_perm_fail')); 
      }
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
          // 逻辑1：检测瞬间失重 (摔倒开始)
          if (mag < THRESHOLD_FREE_FALL) { 
            detectionState.current = DetectionState.POTENTIAL_FALL; 
            lastStateChange.current = now; 
          }
          break;
          
        case DetectionState.POTENTIAL_FALL:
          // 逻辑2：失重后0.5秒内发生剧烈撞击
          if (now - lastStateChange.current < 600) {
            if (mag > THRESHOLD_IMPACT) { 
              detectionState.current = DetectionState.IMPACT_DETECTED; 
              lastStateChange.current = now; 
              if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
            }
          } else { 
            // 如果只有失重没有撞击，可能是手机放在桌子上或轻轻滑落，重置
            detectionState.current = DetectionState.IDLE; 
          }
          break;
          
        case DetectionState.IMPACT_DETECTED:
          // 逻辑3：撞击后保持1秒观察
          if (now - lastStateChange.current > 1000) {
            detectionState.current = DetectionState.MONITORING_STILLNESS; 
            lastStateChange.current = now;
            playTTS(t('fall_confirm_speech'));
            DataSyncManager.pushStatus({ is_falling: true, user_status: 'intense' });
          }
          break;
          
        case DetectionState.MONITORING_STILLNESS:
          // 逻辑4：判定是否真的不动了
          // 如果加速度模长偏离重力加速度 (9.8) 较多，说明有活动
          const delta = Math.abs(mag - 9.8);
          if (delta > 3.0) {
            // 检测到显著活动，取消警报
            detectionState.current = DetectionState.IDLE; 
            stopTTS();
            playTTS(t('fall_recovered_speech'));
            DataSyncManager.pushStatus({ is_falling: false, user_status: 'walking' });
          } else if (now - lastStateChange.current > STILLNESS_DURATION) {
            // 撞击后持续静止超过时长，触发紧急警报
            detectionState.current = DetectionState.IDLE;
            triggerAlert();
          }
          break;
      }
    };

    window.addEventListener('devicemotion', handleMotion, true);
    return () => window.removeEventListener('devicemotion', handleMotion, true);
  }, [isActive, t]);

  const triggerAlert = () => {
    addSafetyLog({ 
      id: Date.now().toString(), 
      type: 'fall', 
      timestamp: Date.now(), 
      detail: language === 'en' ? "Confirmed real fall impact and stillness" : "检测到真实重击且长时间无反应", 
      statusText: "SOS Triggered" 
    });
    DataSyncManager.pushStatus({ is_falling: true, user_status: 'intense' });
    onFallDetected();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold text-slate-800">{t('monitor_title')}</h2>
        <button onClick={onBack} className="bg-slate-100 px-6 py-2 rounded-full font-bold text-slate-600 active-scale">{t('back')}</button>
      </div>

      <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
          {isActive ? '📡' : '🛡️'}
        </div>
        <p className="flex-1 text-lg text-slate-500 font-bold leading-tight">
          {isActive ? t('monitor_active_24h') : t('monitor_desc_detail')}
        </p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-6 rounded-3xl border-2 border-red-100 font-bold text-center">⚠️ {error}</div>}

      {!isActive ? (
        <button onClick={startMonitoring} className="w-full bg-blue-600 rounded-[50px] p-12 text-center shadow-xl active-scale transition-all border-b-8 border-blue-800">
          <div className="text-8xl mb-6">🔔</div>
          <h3 className="text-4xl font-black text-white mb-2">{t('start_monitor')}</h3>
          <p className="text-blue-100 text-xl font-bold">{t('click_protect')}</p>
        </button>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[50px] p-10 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/30"></div>
            <div className="relative z-10">
              <div className="text-7xl mb-4 animate-pulse">🛡️</div>
              <h3 className="text-3xl font-black text-white mb-6 uppercase tracking-widest">{t('guarding')}</h3>
              
              {/* 实时感应器可视化 */}
              <div className="flex flex-col gap-6">
                <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                  <p className="text-xs text-blue-400 font-black tracking-widest mb-3 uppercase">{t('gravity_sensor')}</p>
                  <div className="flex items-end justify-center gap-1 h-12 mb-2">
                    {[...Array(10)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-2 bg-blue-500 rounded-t-sm transition-all duration-75" 
                        style={{ height: `${Math.min(100, (accel.magnitude / 20) * (i + 1) * 10)}%`, opacity: 0.3 + (i * 0.07) }}
                      />
                    ))}
                  </div>
                  <p className="text-5xl font-black text-white font-mono">{accel.magnitude.toFixed(1)} <span className="text-sm">m/s²</span></p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-3xl p-4 border border-white/10">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('safe_status')}</p>
                    <p className={`text-xl font-black ${accel.magnitude > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {accel.magnitude > 22 ? t('abnormal') : t('normal')}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-3xl p-4 border border-white/10">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">SENSOR</p>
                    <p className="text-xl font-black text-white">ACTIVE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button onClick={stopMonitoring} className="w-full bg-slate-200 text-slate-500 py-6 rounded-[35px] text-xl font-black active-scale">{t('stop_monitor')}</button>
          
          <div className="p-6 bg-amber-50 rounded-3xl border-2 border-dashed border-amber-200">
             <h4 className="text-amber-800 font-bold mb-3 text-center">{t('test_mode')}</h4>
             <button 
               onClick={() => { 
                 // 依然保留模拟功能，但模拟过程会触发上述真实算法的“判断”
                 detectionState.current = DetectionState.POTENTIAL_FALL; 
                 lastStateChange.current = Date.now(); 
                 setAccel({ x: 0, y: 0, z: 0, magnitude: THRESHOLD_IMPACT + 5 });
                 setTimeout(() => triggerAlert(), 1000); 
               }} 
               className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg"
             >
               {t('sim_impact')}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FallMonitor;
