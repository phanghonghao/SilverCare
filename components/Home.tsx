
import React, { useState, useEffect } from 'react';
import { AppRoute, Reminder } from '../types';

interface HomeProps {
  setRoute: (route: AppRoute) => void;
  reminders: Reminder[];
}

type PermissionStatus = 'pending' | 'granted' | 'denied' | 'error';

const Home: React.FC<HomeProps> = ({ setRoute, reminders }) => {
  const nextReminder = reminders.find(r => !r.completed);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [perms, setPerms] = useState<{
    media: PermissionStatus;
    location: PermissionStatus;
    motion: PermissionStatus;
  }>({
    media: 'pending',
    location: 'pending',
    motion: 'pending'
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 检查已经存在的权限状态
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as any }).then(res => {
        if (res.state === 'granted') setPerms(p => ({ ...p, media: 'granted' }));
      }).catch(() => {});
      
      navigator.permissions.query({ name: 'geolocation' as any }).then(res => {
        if (res.state === 'granted') setPerms(p => ({ ...p, location: 'granted' }));
      }).catch(() => {});
    }
  }, []);

  const requestMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(t => t.stop());
      setPerms(p => ({ ...p, media: 'granted' }));
    } catch (e) {
      console.error("Media error", e);
      setPerms(p => ({ ...p, media: 'denied' }));
      alert("请在系统设置中允许浏览器访问摄像头和麦克风。");
    }
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setPerms(p => ({ ...p, location: 'error' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setPerms(p => ({ ...p, location: 'granted' })),
      (err) => {
        console.error("Location error", err);
        setPerms(p => ({ ...p, location: 'denied' }));
        alert("请开启GPS并允许位置权限，以便摔倒时能找到您。");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const requestMotion = async () => {
    // Android 通常直接支持，但 iOS 需要触发动作
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        setPerms(p => ({ ...p, motion: permission === 'granted' ? 'granted' : 'denied' }));
      } catch (e) {
        setPerms(p => ({ ...p, motion: 'denied' }));
      }
    } else {
      // Android 只要是 HTTPS 且用户点击过通常就 OK
      setPerms(p => ({ ...p, motion: 'granted' }));
    }
  };

  const allGranted = perms.media === 'granted' && perms.location === 'granted' && perms.motion === 'granted';

  return (
    <div className="p-4 space-y-6">
      {/* Large Clock Display */}
      <section className="flex flex-col items-center justify-center py-4">
        <h1 
          className="text-9xl text-slate-800 leading-none font-time font-bold"
        >
          {currentTime.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-xl text-slate-500 font-medium mt-4 tracking-wider">
          {currentTime.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </section>

      {/* System Status / Permissions Onboarding */}
      {!allGranted && (
        <section className="bg-slate-800 text-white rounded-3xl p-6 shadow-xl border-4 border-blue-500/30">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🛡️</span> 系统安全就绪检查
          </h3>
          <p className="text-slate-300 mb-6">为了让“小玲”能看护您，请依次点击下方按钮开启：</p>
          
          <div className="space-y-4">
            <PermissionRow 
              label="语音与视觉 (聊天/守卫)" 
              status={perms.media} 
              onGrant={requestMedia} 
              icon="📷"
            />
            <PermissionRow 
              label="精准定位 (紧急救助)" 
              status={perms.location} 
              onGrant={requestLocation} 
              icon="📍"
            />
            <PermissionRow 
              label="动作感应 (摔倒检测)" 
              status={perms.motion} 
              onGrant={requestMotion} 
              icon="🏃"
            />
          </div>
          
          {allGranted && (
            <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-2xl text-center animate-pulse">
              <p className="text-green-400 font-bold">✨ 所有功能已准备就绪！</p>
            </div>
          )}
        </section>
      )}

      {/* Welcome Message */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">您好，张爷爷</h2>
        <p className="text-xl text-slate-500">我是小玲，我会一直守护您的安全。</p>
      </section>

      {/* Emergency Call Button */}
      <button 
        onClick={() => window.location.href = 'tel:13800138000'} 
        className="w-full bg-red-500 hover:bg-red-600 text-white rounded-3xl p-6 flex items-center justify-between active-scale transition-colors shadow-lg shadow-red-200"
      >
        <div className="text-left">
          <p className="text-2xl font-bold">紧急呼叫家人</p>
          <p className="opacity-90">一键拨打 儿子小明</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full text-4xl">🚨</div>
      </button>

      {/* Next Reminder */}
      <section className="bg-blue-50 border-l-8 border-blue-500 rounded-r-3xl p-6 shadow-sm">
        <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
          <span>⏰</span> 下一个提醒
        </h3>
        {nextReminder ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800">{nextReminder.title}</p>
              <p className="text-xl text-slate-500">时间：{nextReminder.time}</p>
            </div>
            <button 
              onClick={() => setRoute(AppRoute.REMINDERS)}
              className="bg-blue-600 text-white px-6 py-2 rounded-full text-lg font-bold shadow-md"
            >
              查看
            </button>
          </div>
        ) : (
          <p className="text-lg text-slate-500">今日暂无更多任务。</p>
        )}
      </section>

      {/* Voice Assistant Shortcut */}
      <section 
        onClick={() => setRoute(AppRoute.CHAT)}
        className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer active-scale shadow-xl"
      >
        <div className="bg-white/20 p-6 rounded-full mb-4 animate-bounce">
          <span className="text-5xl">🎙️</span>
        </div>
        <p className="text-3xl font-bold">点我找小玲聊天</p>
        <p className="text-lg opacity-80 mt-2">我可以陪您解闷、讲笑话</p>
      </section>
    </div>
  );
};

interface PermissionRowProps {
  label: string;
  status: PermissionStatus;
  onGrant: () => void;
  icon: string;
}

const PermissionRow: React.FC<PermissionRowProps> = ({ label, status, onGrant, icon }) => {
  const isGranted = status === 'granted';
  return (
    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-lg font-medium">{label}</span>
      </div>
      <button 
        onClick={onGrant}
        disabled={isGranted}
        className={`px-6 py-2 rounded-full font-bold transition-all ${
          isGranted 
            ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
            : 'bg-blue-500 text-white active-scale'
        }`}
      >
        {isGranted ? '✅ 已开启' : '点击开启'}
      </button>
    </div>
  );
};

export default Home;
