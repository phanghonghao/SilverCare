
import React, { useState, useEffect, useRef } from 'react';
import { AppRoute, Reminder, Alarm, UserRole, SyncData, HealthLog, INTENT_KEYWORDS, RemoteConfig } from './types';
import { STORAGE_KEY_NAME, getActiveApiKey, addSafetyLog, matchWakeWord, playTTS, fetchWeatherOrNews, checkQuotaStatus, getCachedData, DataSyncManager, determineUserIntent } from './services/geminiService';
import Home from './components/Home';
import Chat from './components/Chat';
import Reminders from './components/Reminders';
import VisionAssistant from './components/VisionAssistant';
import FamilyWall from './components/FamilyWall';
import FallMonitor from './components/FallMonitor';
import EmergencyAlert from './components/EmergencyAlert';
import AlarmComponent from './components/Alarm';
import AlarmOverlay from './components/AlarmOverlay';
import LiveCall from './components/LiveCall';
import WeatherNewsView from './components/WeatherNewsView';
import RoleDetection from './components/RoleDetection';
import GuardianDashboard from './components/GuardianDashboard';
import MedicationCapture from './components/MedicationCapture';
import VoiceRipple from './components/VoiceRipple';
import TestCenter from './components/TestCenter';
import { useLanguage } from './contexts/LanguageContext';

const App: React.FC = () => {
  const { t } = useLanguage();

  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.UNDETERMINED);
  const [currentRoute, setRoute] = useState<AppRoute>(AppRoute.HOME);
  
  const [isEmergency, setIsEmergency] = useState(false);
  const [medToCapture, setMedToCapture] = useState<string | null>(null);
  const [isForcedMedMode, setIsForcedMedMode] = useState(false);
  const [weatherNewsType, setWeatherNewsType] = useState<'weather' | 'news'>('weather');
  const [cameraSwitchTrigger, setCameraSwitchTrigger] = useState(0); 
  const [hasMedMedal, setHasMedMedal] = useState(false);
  
  const [rmsVolume, setRmsVolume] = useState(0);
  const [isListeningForVoice, setIsListeningForVoice] = useState(false);
  const [isWaitingForCommand, setIsWaitingForCommand] = useState(false); 
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  
  // 语音监控 debug 状态
  const [rawText, setRawText] = useState<string>('等待唤醒...');
  const [parsedIntent, setParsedIntent] = useState<string>('就绪');
  const [isIntentActive, setIsIntentActive] = useState(false);

  const [quotaHit, setQuotaHit] = useState(false);
  const [isPreheating, setIsPreheating] = useState(false);

  const [reminders, setReminders] = useState<Reminder[]>([
    { id: '1', time: '08:30', title: '吃降压药', type: 'med', completed: false },
    { id: '2', time: '12:30', title: '中午用药', type: 'med', completed: false },
  ]);

  const [alarms, setAlarms] = useState<Alarm[]>([
    { id: 'high-p', time: '12:30', label: '吃药时间', enabled: true, isHighPriority: true }
  ]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (userRole !== UserRole.ELDERLY) return;
    const unsubs = DataSyncManager.subscribe(() => {
      const remoteConfig = DataSyncManager.getRemoteConfig();
      if (remoteConfig.alarms && remoteConfig.alarms.length > 0) {
        setAlarms(remoteConfig.alarms);
      }
    });
    return unsubs;
  }, [userRole]);

  useEffect(() => {
    if (userRole !== UserRole.ELDERLY || !hasApiKey) return;
    const heartbeat = setInterval(() => {
      DataSyncManager.pushStatus({
        user_status: 'quiet',
        step_count: 5823,
        current_route: currentRoute,
        is_falling: isEmergency
      });
    }, 5000);
    return () => clearInterval(heartbeat);
  }, [userRole, hasApiKey, currentRoute, isEmergency]);

  useEffect(() => {
    if (!hasApiKey || userRole !== UserRole.ELDERLY) return;
    const startPreheat = async () => {
      if (getCachedData('weather') && getCachedData('news')) return;
      setIsPreheating(true);
      try {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            await Promise.all([fetchWeatherOrNews('weather', latitude, longitude), fetchWeatherOrNews('news', latitude, longitude)]);
            setIsPreheating(false);
          },
          async () => {
            await Promise.all([fetchWeatherOrNews('weather', 0, 0), fetchWeatherOrNews('news', 0, 0)]);
            setIsPreheating(false);
          }
        );
      } catch (e) { setIsPreheating(false); }
    };
    startPreheat();
  }, [hasApiKey, userRole]);

  useEffect(() => {
    const timer = setInterval(() => setQuotaHit(checkQuotaStatus()), 2000);
    return () => clearInterval(timer);
  }, []);

  // 强化语音控制与实时监控
  useEffect(() => {
    if (userRole !== UserRole.ELDERLY || !hasApiKey || currentRoute === AppRoute.LIVE_CALL) {
      setIsListeningForVoice(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          handleVoiceCommand(event.results[i][0].transcript);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        setRawText(interimTranscript); 
        setIsListeningForVoice(true);
        setRmsVolume(isWaitingForCommand ? 100 : 40);

        if (vadTimerRef.current) window.clearTimeout(vadTimerRef.current);
        vadTimerRef.current = window.setTimeout(() => {
          if (interimTranscript.trim().length > 0) {
            handleVoiceCommand(interimTranscript);
            // Don't stop recognition here, let handleVoiceCommand manage it if needed
          }
        }, isWaitingForCommand ? 800 : 1800); 
      }
    };

    const handleVoiceCommand = async (text: string) => {
      if (quotaHit || !text.trim()) return;
      
      setRawText(text);
      setIsIntentActive(false);

      const hasWakeWord = matchWakeWord(text);

      // 场景 A: 唤醒并直通 (e.g. "小玲你好，我想看看新闻")
      if (hasWakeWord && (INTENT_KEYWORDS.NEWS.some(k => text.includes(k)) || INTENT_KEYWORDS.WEATHER.some(k => text.includes(k)))) {
         const type = INTENT_KEYWORDS.NEWS.some(k => text.includes(k)) ? 'news' : 'weather';
         setParsedIntent(`直达 -> ${type === 'news' ? '新闻' : '天气'}`);
         setIsIntentActive(true);
         setWeatherNewsType(type);
         setRoute(AppRoute.WEATHER_NEWS);
         setIsWaitingForCommand(false);
         return;
      }

      // 场景 B: 唤醒后的连读指令 (正在等待命令)
      if (isWaitingForCommand) {
        setIsWaitingForCommand(false);
        setParsedIntent("正在解析...");
        
        const intent = await determineUserIntent(text);
        
        if (intent.action === 'NAVIGATE' && intent.route) {
          setParsedIntent(`操作 -> ${intent.route}`);
          setIsIntentActive(true);
          if (intent.data?.type) setWeatherNewsType(intent.data.type);
          setRoute(intent.route as AppRoute);
        } else if (intent.action === 'REPLY' && intent.reply) {
          setParsedIntent("智能回应");
          setIsIntentActive(true);
          await playTTS(intent.reply);
        } else {
          setParsedIntent("无匹配意图");
          await playTTS("刚才没听明白，您再说一遍？");
        }
        return;
      }

      // 场景 C: 基础唤醒
      if (hasWakeWord) {
        setParsedIntent("已唤醒: 倾听指令...");
        setIsIntentActive(true);
        // 先临时停止监听，播放回复后再恢复，避免录入自己的声音
        recognition.stop();
        setIsListeningForVoice(false);
        
        await playTTS("哎，我在呢，您想做什么？");
        
        setIsWaitingForCommand(true);
        setRawText("请说出您的指令...");
        return;
      }
    };

    recognition.onend = () => { 
      setIsListeningForVoice(false); 
      // 只要不是在视频通话，就确保持续重启
      if (currentRoute !== AppRoute.LIVE_CALL) {
        try { recognition.start(); } catch(e) {} 
      }
    };
    
    try { recognition.start(); } catch(e) {}
    return () => { try { recognition.stop(); } catch(e) {} };
  }, [userRole, hasApiKey, currentRoute, quotaHit, isWaitingForCommand]);

  const vadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const existingKey = getActiveApiKey();
        if (existingKey && existingKey.length > 10) { setHasApiKey(true); return; }
        const win = window as any;
        if (win.aistudio?.hasSelectedApiKey && await win.aistudio.hasSelectedApiKey()) { setHasApiKey(true); return; }
      } catch (e) {
      } finally { setIsCheckingKey(false); }
    };
    checkKey();
  }, []);

  const handleBack = () => {
    setRoute(AppRoute.HOME);
    setIsWaitingForCommand(false);
    setParsedIntent("就绪");
    setRawText("等待唤醒...");
  };

  const renderView = () => {
    if (currentRoute === AppRoute.TEST) return <TestCenter onBack={handleBack} />;
    if (userRole === UserRole.UNDETERMINED) return <RoleDetection onRoleDetected={setUserRole} />;
    if (userRole === UserRole.CHILD) return <GuardianDashboard />;

    switch (currentRoute) {
      case AppRoute.HOME: return <Home setRoute={setRoute} handleGoWeatherNews={(t) => { setWeatherNewsType(t); setRoute(AppRoute.WEATHER_NEWS); }} reminders={reminders} hasMedal={hasMedMedal} />;
      case AppRoute.CHAT: return <Chat onBack={handleBack} />;
      case AppRoute.VISION: return <VisionAssistant voiceSwitchTrigger={cameraSwitchTrigger} onBack={handleBack} />;
      case AppRoute.FAMILY: return <FamilyWall onBack={handleBack} />;
      case AppRoute.REMINDERS: return <Reminders reminders={reminders} onBack={handleBack} onToggle={(id) => setReminders(p => p.map(r => r.id === id ? {...r, completed: !r.completed} : r))} onAdd={(t,l,ty) => {}} onDelete={(id) => {}} />;
      case AppRoute.ALARM: return <AlarmComponent alarms={alarms} onBack={handleBack} onToggle={(id) => setAlarms(p => p.map(a => a.id === id ? {...a, enabled: !a.enabled} : a))} onDelete={(id) => setAlarms(p => p.filter(a => a.id !== id))} onAdd={(time, label) => { const newAlarms = [...alarms, { id: Date.now().toString(), time, label, enabled: true }]; setAlarms(newAlarms); DataSyncManager.pushConfig({ alarms: newAlarms }); }} />;
      case AppRoute.SAFETY: return <FallMonitor onBack={handleBack} onFallDetected={() => setIsEmergency(true)} />;
      case AppRoute.LIVE_CALL: return <LiveCall onEnd={handleBack} voiceSwitchTrigger={cameraSwitchTrigger} initialPrompt={initialPrompt} />;
      case AppRoute.WEATHER_NEWS: return <WeatherNewsView type={weatherNewsType} onBack={handleBack} />;
      case AppRoute.MED_CAPTURE: return medToCapture ? <MedicationCapture medName={medToCapture} isForced={isForcedMedMode} onComplete={() => { setReminders(prev => prev.map(r => r.title === medToCapture ? {...r, completed: true} : r)); setHasMedMedal(true); setIsForcedMedMode(false); setMedToCapture(null); setRoute(AppRoute.HOME); }} onCancel={() => { if (isForcedMedMode) { playTTS("请先吃药。"); return; } setMedToCapture(null); setRoute(AppRoute.HOME); }} /> : <Home setRoute={setRoute} handleGoWeatherNews={(t) => { setWeatherNewsType(t); setRoute(AppRoute.WEATHER_NEWS); }} reminders={reminders} />;
      default: return <Home setRoute={setRoute} handleGoWeatherNews={(t) => { setWeatherNewsType(t); setRoute(AppRoute.WEATHER_NEWS); }} reminders={reminders} hasMedal={hasMedMedal} />;
    }
  };

  if (isCheckingKey) return <div className="h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 font-mono">LOADING...</div>;

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 p-8 items-center justify-center text-center space-y-8">
         <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-5xl">🤖</div>
         <h1 className="text-3xl font-black">SilverCare</h1>
         <button onClick={async () => { const win = window as any; if (win.aistudio?.openSelectKey) { try { await win.aistudio.openSelectKey(); setHasApiKey(true); return; } catch (e) {} } }} className="w-full bg-blue-600 text-white py-5 rounded-[30px] text-xl font-bold">配置</button>
      </div>
    );
  }

  const isWideLayout = currentRoute === AppRoute.TEST;

  return (
    <div className={`flex flex-col h-screen ${isWideLayout ? 'max-w-4xl' : 'max-w-md'} mx-auto bg-slate-50 shadow-2xl overflow-hidden relative pt-14`}>
      {/* 增强型语音监视器 (Voice Monitor Bar) */}
      {userRole === UserRole.ELDERLY && currentRoute !== AppRoute.LIVE_CALL && (
        <div className="absolute top-0 left-0 right-0 z-[2000] bg-slate-900 shadow-2xl border-b border-white/10">
           <div className="flex items-center h-12 px-3 gap-3">
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                 <div className="flex flex-col">
                    <span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter leading-none mb-0.5">RAW TEXT</span>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                       <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isListeningForVoice ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></div>
                       <p className="text-[11px] font-mono text-blue-100 truncate italic">
                          {rawText}
                       </p>
                    </div>
                 </div>
              </div>
              
              <div className="w-px h-6 bg-white/10 shrink-0"></div>

              <div className="flex flex-col flex-1 overflow-hidden">
                 <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter leading-none mb-0.5">INTENT</span>
                 <div className="flex items-center gap-1.5 overflow-hidden">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isIntentActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-700'}`}></div>
                    <p className={`text-[11px] font-mono truncate uppercase tracking-tight ${isIntentActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                       {parsedIntent}
                    </p>
                 </div>
              </div>
           </div>
           
           {/* 加载进度条动画 - 仅在等待指令时 */}
           {isWaitingForCommand && (
             <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-[pulse_1s_infinite]"></div>
           )}
        </div>
      )}

      <div className="absolute top-16 right-4 z-[600] flex items-center gap-1.5">
         <div className={`w-2 h-2 rounded-full ${quotaHit ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
         <span className="text-[10px] font-bold text-slate-400">{quotaHit ? '小玲休息中' : isPreheating ? '正在预热数据' : '语音就绪'}</span>
      </div>

      {isEmergency && <EmergencyAlert onCancel={() => setIsEmergency(false)} />}
      {userRole === UserRole.ELDERLY && <VoiceRipple volume={rmsVolume} isActive={isListeningForVoice || isWaitingForCommand} />}
      
      <main className="flex-1 overflow-y-auto relative">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
