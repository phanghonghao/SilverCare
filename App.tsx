
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

  // 改进的语音监听逻辑
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
          const finalResult = event.results[i][0].transcript;
          handleVoiceCommand(finalResult);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // 关键：实时更新 RAW TEXT 显示
      if (interimTranscript) {
        setRawText(interimTranscript); 
        setIsListeningForVoice(true);
        // 动态音量波纹
        setRmsVolume(isWaitingForCommand ? 90 : 35);

        // VAD (语音活动检测) 自动截断
        if (vadTimerRef.current) window.clearTimeout(vadTimerRef.current);
        vadTimerRef.current = window.setTimeout(() => {
          if (interimTranscript.trim().length > 0) {
            handleVoiceCommand(interimTranscript);
            recognition.stop(); 
          }
        }, isWaitingForCommand ? 1000 : 1500); // 唤醒后指令检测更灵敏
      }
    };

    const handleVoiceCommand = async (text: string) => {
      if (quotaHit || !text.trim()) return;
      
      setRawText(text); // 确保最后一次完整结果显示
      setIsIntentActive(false);

      const hasWakeWord = matchWakeWord(text);

      // 场景 A: 唤醒并直达指令 (例如 "小玲你好，开启视讯")
      if (hasWakeWord && INTENT_KEYWORDS.CALL.some(k => text.includes(k))) {
        setParsedIntent("开启视讯陪伴 (直接指令)");
        setIsIntentActive(true);
        setInitialPrompt(text);
        setRoute(AppRoute.LIVE_CALL);
        setIsWaitingForCommand(false);
        return;
      }

      // 场景 B: 唤醒后的后续指令监听 (状态机：isWaitingForCommand 为 true)
      if (isWaitingForCommand) {
        setIsWaitingForCommand(false);
        setParsedIntent("正在解析 AI 意图...");
        
        const intent = await determineUserIntent(text);
        
        if (intent.action === 'NAVIGATE' && intent.route) {
          setParsedIntent(`跳转到 -> ${intent.route}`);
          setIsIntentActive(true);
          if (intent.data?.type) setWeatherNewsType(intent.data.type);
          setRoute(intent.route as AppRoute);
          if (intent.route === AppRoute.LIVE_CALL) setInitialPrompt(text);
        } else if (intent.action === 'REPLY' && intent.reply) {
          setParsedIntent("智能回复");
          setIsIntentActive(true);
          await playTTS(intent.reply);
        } else {
          setParsedIntent("意图不明确");
          await playTTS("好的，已收到您的吩咐。");
        }
        return;
      }

      // 场景 C: 纯唤醒 (例如 只说了 "小玲你好")
      if (hasWakeWord) {
        setParsedIntent("唤醒成功: 倾听中...");
        setIsIntentActive(true);
        recognition.stop(); // 停止当前段，准备进入回复和下一段监听
        setIsListeningForVoice(false); 
        
        await playTTS("您好，有什么吩咐吗？");
        
        // 标记为正在等待具体指令
        setIsWaitingForCommand(true);
        setRawText("请下达指令...");
        return;
      }

      // 场景 D: 非唤醒状态下的特定关键词识别 (容错)
      if (INTENT_KEYWORDS.CALL.some(k => text.includes(k))) {
        setParsedIntent("关键词匹配: 视讯");
        setIsIntentActive(true);
        setRoute(AppRoute.LIVE_CALL);
      }
    };

    recognition.onend = () => { 
      setIsListeningForVoice(false); 
      // 循环重启监听，除非是在进行视讯通话
      if (currentRoute !== AppRoute.LIVE_CALL) {
        try { recognition.start(); } catch(e) {} 
      }
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
      {/* 智能语音监视器 (Voice Intelligence Monitor) */}
      {userRole === UserRole.ELDERLY && currentRoute !== AppRoute.LIVE_CALL && (
        <div className="absolute top-0 left-0 right-0 z-[1000] bg-slate-900/95 backdrop-blur-xl border-b border-white/5 p-2 shadow-2xl">
           <div className="flex flex-col gap-1 px-2">
              <div className="flex justify-between items-center h-5">
                 <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isListeningForVoice ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter shrink-0">RAW TEXT</span>
                    <p className="text-[11px] font-mono text-blue-300 truncate">{rawText}</p>
                 </div>
                 <div className="flex items-center gap-2 flex-1 justify-end ml-4">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-tighter uppercase shrink-0 transition-all ${isIntentActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>INTENT</span>
                    <p className={`text-[11px] font-mono truncate text-right ${isIntentActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>{parsedIntent}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="absolute top-16 right-4 z-[600] flex items-center gap-1.5">
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
