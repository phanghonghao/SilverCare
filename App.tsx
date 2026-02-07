
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
  const [parsedIntent, setParsedIntent] = useState<string>('无');
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

  // 核心语音控制与监控逻辑
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
        setRawText(interimTranscript); // 实时显示在顶栏
        setIsListeningForVoice(true);
        setRmsVolume(isWaitingForCommand ? 80 : 40); 
        if (vadTimerRef.current) window.clearTimeout(vadTimerRef.current);
        vadTimerRef.current = window.setTimeout(() => {
          if (interimTranscript.trim().length > 0) {
            handleVoiceCommand(interimTranscript);
            recognition.stop(); 
          }
        }, 1200);
      }
    };

    const handleVoiceCommand = async (text: string) => {
      if (quotaHit) return;
      setRawText(text);
      setIsIntentActive(false);

      const hasWakeWord = matchWakeWord(text);

      // 1. 直达模式：小玲你好 + 动作关键词
      if (hasWakeWord && INTENT_KEYWORDS.CALL.some(k => text.includes(k))) {
        setParsedIntent("开启视讯陪伴 (直达)");
        setIsIntentActive(true);
        setInitialPrompt(text);
        setRoute(AppRoute.LIVE_CALL);
        setIsWaitingForCommand(false);
        return;
      }
      
      if (hasWakeWord && INTENT_KEYWORDS.WEATHER.some(k => text.includes(k))) {
        setParsedIntent("跳转 -> 天气 (直达)");
        setIsIntentActive(true);
        setWeatherNewsType('weather');
        setRoute(AppRoute.WEATHER_NEWS);
        setIsWaitingForCommand(false);
        return;
      }

      // 2. 二次指令确认模式
      if (isWaitingForCommand) {
        setIsWaitingForCommand(false);
        setParsedIntent("AI 解析意图中...");
        const intent = await determineUserIntent(text);
        
        if (intent.action === 'NAVIGATE' && intent.route) {
          setParsedIntent(`跳转 -> ${intent.route}`);
          setIsIntentActive(true);
          if (intent.data?.type) setWeatherNewsType(intent.data.type);
          setRoute(intent.route as AppRoute);
          if (intent.route === AppRoute.LIVE_CALL) setInitialPrompt(text);
        } else if (intent.action === 'REPLY' && intent.reply) {
          setParsedIntent("执行回复动作");
          setIsIntentActive(true);
          await playTTS(intent.reply);
        } else {
          setParsedIntent("意图不明");
          await playTTS("好的，已收到。");
        }
        return;
      }

      // 3. 基础唤醒模式
      if (hasWakeWord) {
        setParsedIntent("唤醒成功，倾听中...");
        setIsIntentActive(true);
        recognition.stop(); 
        setIsListeningForVoice(true); 
        await playTTS("您好，有什么吩咐吗？");
        setIsWaitingForCommand(true);
        return;
      }

      // 4. 非唤醒状态下的关键词兜底 (仅针对核心功能)
      if (INTENT_KEYWORDS.CALL.some(k => text.includes(k))) {
        setParsedIntent("匹配关键词: 视讯");
        setIsIntentActive(true);
        setRoute(AppRoute.LIVE_CALL);
      }
    };

    recognition.onend = () => { 
      setIsListeningForVoice(false); 
      try { recognition.start(); } catch(e) {} 
    };
    
    try { recognition.start(); } catch(e) {}
    return () => { try { recognition.stop(); } catch(e) {} };
  }, [userRole, hasApiKey, reminders, currentRoute, quotaHit, isWaitingForCommand]);

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

  const handleBack = () => setRoute(AppRoute.HOME);
  
  const handleAddReminder = (time: string, title: string, type: Reminder['type']) => {
    setReminders(prev => {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        time,
        title,
        type,
        completed: false
      };
      // 添加并自动按时间排序
      const newList = [...prev, newReminder];
      return newList.sort((a, b) => a.time.localeCompare(b.time));
    });
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
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
      case AppRoute.REMINDERS: return <Reminders 
        reminders={reminders} 
        onBack={handleBack} 
        onToggle={(id) => setReminders(p => p.map(r => r.id === id ? {...r, completed: !r.completed} : r))}
        onAdd={handleAddReminder}
        onDelete={handleDeleteReminder}
      />;
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
    <div className={`flex flex-col h-screen ${isWideLayout ? 'max-w-4xl' : 'max-w-md'} mx-auto bg-slate-50 shadow-2xl overflow-hidden relative pt-12`}>
      {/* 智能语音监视器 (Voice Monitor) */}
      {userRole === UserRole.ELDERLY && currentRoute !== AppRoute.LIVE_CALL && (
        <div className="absolute top-0 left-0 right-0 z-[1000] bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 flex items-center justify-between border-b border-white/10 shadow-lg">
           <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="bg-blue-600 text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter uppercase shrink-0">RAW</span>
              <p className="text-xs font-mono truncate text-blue-200">{rawText}</p>
           </div>
           <div className="flex items-center gap-2 flex-1 justify-end ml-4">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter uppercase shrink-0 transition-all ${isIntentActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>INTENT</span>
              <p className={`text-xs font-mono truncate text-right ${isIntentActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>{parsedIntent}</p>
           </div>
        </div>
      )}

      <div className="absolute top-14 right-4 z-[600] flex items-center gap-1.5">
         <div className={`w-2 h-2 rounded-full ${quotaHit ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
         <span className="text-[10px] font-bold text-slate-400">{quotaHit ? '小玲休息中' : isPreheating ? '正在预热数据' : '系统就绪'}</span>
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
