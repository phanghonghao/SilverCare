
import React, { useState, useEffect } from 'react';
import { AppRoute, Reminder, Alarm } from './types';
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

const App: React.FC = () => {
  const [currentRoute, setRoute] = useState<AppRoute>(AppRoute.HOME);
  const [isEmergency, setIsEmergency] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: '1', time: '08:30', title: '吃降壓药', type: 'med', completed: false },
    { id: '2', time: '12:00', title: '吃維生素', type: 'med', completed: false },
  ]);

  const [alarms, setAlarms] = useState<Alarm[]>([
    { id: 'a1', time: '07:30', label: '早上起床', enabled: true }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const str = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const triggered = alarms.find(a => a.enabled && a.time === str);
      if (triggered && (!activeAlarm || activeAlarm.id !== triggered.id)) setActiveAlarm(triggered);
    }, 1000);
    return () => clearInterval(timer);
  }, [alarms, activeAlarm]);

  const toggleReminder = (id: string) => setReminders(p => p.map(r => r.id === id ? {...r, completed: !r.completed} : r));
  const toggleAlarm = (id: string) => setAlarms(p => p.map(a => a.id === id ? {...a, enabled: !a.enabled} : a));
  const deleteAlarm = (id: string) => setAlarms(p => p.filter(a => a.id !== id));
  const addAlarm = (time: string, label: string) => setAlarms(p => [...p, { id: Date.now().toString(), time, label, enabled: true }]);

  const renderView = () => {
    switch (currentRoute) {
      case AppRoute.HOME: return <Home setRoute={setRoute} reminders={reminders} />;
      case AppRoute.CHAT: return <Chat />;
      case AppRoute.VISION: return <VisionAssistant />;
      case AppRoute.FAMILY: return <FamilyWall />;
      case AppRoute.REMINDERS: return <Reminders reminders={reminders} onToggle={toggleReminder} />;
      case AppRoute.ALARM: return <AlarmComponent alarms={alarms} onToggle={toggleAlarm} onDelete={deleteAlarm} onAdd={addAlarm} />;
      case AppRoute.SAFETY: return <FallMonitor onFallDetected={() => setIsEmergency(true)} />;
      case AppRoute.LIVE_CALL: return <LiveCall onEnd={() => setRoute(AppRoute.HOME)} />;
      default: return <Home setRoute={setRoute} reminders={reminders} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 shadow-2xl overflow-hidden relative font-sans">
      {isEmergency && <EmergencyAlert onCancel={() => setIsEmergency(false)} />}
      {activeAlarm && <AlarmOverlay alarm={activeAlarm} onDismiss={() => setActiveAlarm(null)} />}

      {/* 統一頂欄：高度減半，更緊湊 */}
      {currentRoute !== AppRoute.LIVE_CALL && (
        <header className="bg-blue-600 text-white p-3 shadow-lg shrink-0 flex items-center justify-between">
          {currentRoute !== AppRoute.HOME ? (
            <button onClick={() => setRoute(AppRoute.HOME)} className="text-lg font-bold bg-white/20 px-3 py-1 rounded-xl">
              ← 返回
            </button>
          ) : (
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>SilverCare</span>
              <span className="opacity-80 font-normal text-sm">智慧關懷</span>
            </h1>
          )}
          <div className="text-xs bg-blue-500 px-3 py-1 rounded-full font-bold">小玲在線</div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto bg-slate-50">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
