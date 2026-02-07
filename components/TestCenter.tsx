
import React, { useState, useEffect } from 'react';
import { DataSyncManager } from '../services/geminiService';
import { SyncData } from '../types';
import GuardianDashboard from './GuardianDashboard';
import { useLanguage } from '../contexts/LanguageContext';

interface TestCenterProps {
  onBack: () => void;
}

const TestCenter: React.FC<TestCenterProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const [elderlyStatus, setElderlyStatus] = useState<'safe' | 'falling'>('safe');
  const [syncData, setSyncData] = useState<SyncData>(DataSyncManager.getLatestSyncData());

  useEffect(() => {
    const refresh = () => setSyncData(DataSyncManager.getLatestSyncData());
    const unsub = DataSyncManager.subscribe(refresh);
    return unsub;
  }, []);

  const simulateFall = () => {
    setElderlyStatus('falling');
    DataSyncManager.pushStatus({ 
      is_falling: true, 
      user_status: 'intense',
      last_heartbeat: Date.now() 
    });
  };

  const simulateReset = () => {
    setElderlyStatus('safe');
    DataSyncManager.pushStatus({ 
      is_falling: false, 
      user_status: 'quiet',
      last_heartbeat: Date.now() 
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      <header className="bg-white p-4 flex justify-between items-center border-b shadow-sm">
        <h2 className="text-xl font-black">{t('test_title')}</h2>
        <button onClick={onBack} className="bg-slate-200 px-4 py-2 rounded-full text-sm font-bold">{t('exit_test')}</button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：父母端模拟 */}
        <div className="w-1/2 border-r border-slate-200 flex flex-col p-6 bg-white">
          <div className="mb-4 flex items-center gap-2">
             <span className="text-2xl">👴</span>
             <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs">{t('sim_parent_phone')}</h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-inner border-4 ${
              elderlyStatus === 'safe' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-500 animate-bounce'
            }`}>
              {elderlyStatus === 'safe' ? '✅' : '🆘'}
            </div>
            
            <div className="text-center">
              <p className="text-xl font-black text-slate-800">
                {elderlyStatus === 'safe' ? t('status_safe_state') : t('status_warning')}
              </p>
              <p className="text-sm text-slate-400 mt-1">{t('sim_shake')}</p>
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={simulateFall}
                disabled={elderlyStatus === 'falling'}
                className="w-full bg-red-600 text-white py-6 rounded-3xl text-2xl font-black shadow-xl active-scale disabled:opacity-50"
              >
                {t('i_fell')}
              </button>
              
              <button 
                onClick={simulateReset}
                className="w-full bg-slate-100 text-slate-500 py-4 rounded-3xl font-bold"
              >
                {t('restore_safe')}
              </button>
            </div>
          </div>
          
          <div className="mt-auto bg-blue-50 p-4 rounded-2xl text-[10px] text-blue-600 leading-tight">
            <strong>{t('logic_note')}</strong>
          </div>
        </div>

        {/* 右侧：子女端模拟 */}
        <div className="w-1/2 flex flex-col relative bg-slate-50">
          <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
             <span className="text-2xl">👩‍👧</span>
             <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs">{t('sim_child_dashboard')}</h3>
          </div>
          
          {/* 这里复用真实的 GuardianDashboard 组件 */}
          <div className="flex-1 scale-90 origin-top shadow-2xl rounded-[40px] overflow-hidden border-8 border-slate-800">
            <GuardianDashboard />
          </div>

          <div className="p-4 bg-slate-800 text-white text-[10px] flex justify-between items-center">
             <span>Cloud: {syncData.is_falling ? t('cloud_status_alert') : t('cloud_status_ok')}</span>
             <span>{t('latency')}: ~50ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCenter;
    