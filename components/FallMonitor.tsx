
import React, { useState, useEffect, useRef } from 'react';
import { SensorData } from '../types';

interface FallMonitorProps {
  onFallDetected: () => void;
}

const FallMonitor: React.FC<FallMonitorProps> = ({ onFallDetected }) => {
  const [isActive, setIsActive] = useState(false);
  const [accel, setAccel] = useState<SensorData>({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [isPC, setIsPC] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fallCooldown = useRef(false);

  useEffect(() => {
    const hasMotion = 'DeviceMotionEvent' in window;
    const isDesktop = /Windows|Macintosh|Linux/.test(navigator.userAgent) && !('ontouchstart' in window);
    if (!hasMotion || isDesktop) {
      setIsPC(true);
    }
  }, []);

  const requestPermission = async () => {
    setError(null);
    if (isPC) {
      setIsActive(true);
      return;
    }

    // iOS 13+ 特有逻辑
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setIsActive(true);
        } else {
          setError("权限被拒绝，摔倒监测无法运行。");
        }
      } catch (e) {
        console.error("Permission request failed", e);
        setError("无法发起权限请求。请尝试刷新页面。");
      }
    } else {
      // Android / 其他
      setIsActive(true);
    }
  };

  useEffect(() => {
    if (!isActive || isPC) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      // Android WebView 兼容性处理
      const ag = event.accelerationIncludingGravity;
      if (!ag) return;

      const nx = ag.x || 0;
      const ny = ag.y || 0;
      const nz = ag.z || 0;
      
      const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);

      setAccel({ x: nx, y: ny, z: nz, magnitude: mag });

      // 摔倒检测阈值优化
      if (mag > 30 && !fallCooldown.current) {
        triggerFall();
      }
    };

    window.addEventListener('devicemotion', handleMotion, true);
    return () => window.removeEventListener('devicemotion', handleMotion, true);
  }, [isActive, isPC]);

  const triggerFall = () => {
    fallCooldown.current = true;
    onFallDetected();
    setTimeout(() => {
      fallCooldown.current = false;
    }, 5000); 
  };

  const simulateImpact = (strength: number) => {
    setAccel(prev => ({ ...prev, magnitude: strength }));
    if (strength > 30) triggerFall();
    setTimeout(() => setAccel(prev => ({ ...prev, magnitude: 9.8 })), 500);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">摔倒自动监测</h2>
        <p className="text-lg text-slate-500 leading-relaxed">
          {isPC 
            ? "电脑演示模式：点击下方按钮模拟摔倒情况。" 
            : "手机监测模式：将手机放在兜里，系统会自动检测剧烈撞击。"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border-2 border-red-100 font-bold text-center">
          ⚠️ {error}
        </div>
      )}

      {!isActive ? (
        <button 
          onClick={requestPermission}
          className="w-full bg-blue-600 rounded-3xl p-10 text-center shadow-xl active-scale transition-all"
        >
          <div className="text-7xl mb-6">🛡️</div>
          <h3 className="text-3xl font-bold text-white mb-2">启动监测系统</h3>
          <p className="text-blue-100 text-lg">点击后开始保护您的安全</p>
        </button>
      ) : (
        <div className="space-y-6">
          <div className={`${isPC ? 'bg-slate-800' : 'bg-green-600'} rounded-3xl p-8 text-center shadow-xl transition-colors duration-500`}>
            <div className="text-7xl mb-4 animate-pulse">📡</div>
            <h3 className="text-3xl font-bold text-white mb-2">守护中...</h3>
            <p className="text-white/80 mb-6 italic">传感器正在接收信号</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase font-bold tracking-widest">加速度模长</p>
                <p className="text-3xl font-black text-white">{accel.magnitude.toFixed(1)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase font-bold tracking-widest">安全状态</p>
                <p className={`text-2xl font-black ${accel.magnitude > 22 ? 'text-yellow-300' : 'text-green-300'}`}>
                  {accel.magnitude > 22 ? "剧烈" : "正常"}
                </p>
              </div>
            </div>
          </div>

          {isPC && (
            <div className="bg-white rounded-3xl p-8 shadow-md border-4 border-dashed border-slate-200">
              <h4 className="text-xl font-bold text-slate-700 mb-6 text-center">演示功能</h4>
              <button 
                onClick={() => simulateImpact(35)}
                className="w-full bg-red-500 text-white py-8 rounded-2xl text-2xl font-black active-scale shadow-lg shadow-red-200"
              >
                模拟跌倒撞击！
              </button>
            </div>
          )}
        </div>
      )}

      {isActive && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
          <p className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">底层硬件信号流</p>
          <div className="h-24 flex items-end gap-1.5">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className={`${accel.magnitude > 25 ? 'bg-red-500' : 'bg-blue-500'} flex-1 rounded-t-lg transition-all duration-75`}
                style={{ height: `${Math.min(100, (accel.magnitude / 45) * 100)}%` }}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FallMonitor;
