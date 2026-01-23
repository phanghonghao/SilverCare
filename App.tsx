
import React, { useState, useEffect } from 'react';
import { AppRoute, Reminder, Message } from './types';
import Home from './components/Home';
import Chat from './components/Chat';
import Reminders from './components/Reminders';
import Health from './components/Health';
import Guardian from './components/Guardian';
import FallMonitor from './components/FallMonitor';
import EmergencyAlert from './components/EmergencyAlert';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.HOME);
  const [isEmergency, setIsEmergency] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: '1', time: '08:30', title: '吃降压药', type: 'med', completed: false },
    { id: '2', time: '10:00', title: '喝一大杯水', type: 'water', completed: false },
    { id: '3', time: '15:00', title: '小区散步', type: 'exercise', completed: false },
    { id: '4', time: '19:00', title: '吃维生素', type: 'med', completed: false },
  ]);

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const handleFallDetected = () => {
    setIsEmergency(true);
  };

  const renderView = () => {
    switch (currentRoute) {
      case AppRoute.HOME:
        return <Home setRoute={setCurrentRoute} reminders={reminders} />;
      case AppRoute.CHAT:
        return <Chat />;
      case AppRoute.GUARDIAN:
        return <Guardian />;
      case AppRoute.SAFETY:
        return <FallMonitor onFallDetected={handleFallDetected} />;
      case AppRoute.REMINDERS:
        return <Reminders reminders={reminders} onToggle={toggleReminder} />;
      case AppRoute.HEALTH:
        return <Health />;
      default:
        return <Home setRoute={setCurrentRoute} reminders={reminders} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 shadow-2xl overflow-hidden relative">
      {/* Emergency Overlay */}
      {isEmergency && (
        <EmergencyAlert onCancel={() => setIsEmergency(false)} />
      )}

      {/* Status Bar / Top Header */}
      <header className="bg-blue-600 text-white p-4 pt-8 shadow-md shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">SilverCare 智慧关怀</h1>
          <div className="text-sm bg-blue-500 px-3 py-1 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            小玲在线
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        {renderView()}
      </main>

      {/* Fixed Bottom Navigation */}
      <Navigation currentRoute={currentRoute} setRoute={setCurrentRoute} />
    </div>
  );
};

export default App;
