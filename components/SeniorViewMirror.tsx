
import React from 'react';
import { SyncData, AppRoute } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SeniorViewMirrorProps {
  syncData: SyncData | null;
}

const SeniorViewMirror: React.FC<SeniorViewMirrorProps> = ({ syncData }) => {
  const { t } = useLanguage();
  if (!syncData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-4">
        <div className="text-5xl opacity-20">📡</div>
        <p className="text-slate-400 font-bold">{t('establishing_link')}</p>
      </div>
    );
  }

  const isOnline = Date.now() - syncData.last_heartbeat < 15000;
  const currentRoute = syncData.current_route || AppRoute.HOME;

  // 模拟长者端的 UI 布局
  return (
    <div className="h-full bg-slate-50 flex flex-col p-4 space-y-4 font-sans select-none pointer-events-none">
      <div className="bg-blue-600 rounded-t-3xl p-6 text-white flex justify-between items-end">
        <div>
          <h4 className="text-lg font-black">{t('app_name')}</h4>
          <p className="text-[10px] opacity-70">{t('mirror_readonly')}</p>
        </div>
        <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">
          {isOnline ? t('realtime_sync') : t('disconnected')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-10">
        {currentRoute === AppRoute.HOME && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-yellow-400 h-24 rounded-3xl flex flex-col items-center justify-center text-yellow-900 border-b-4 border-yellow-600">
                <span className="text-2xl">🌤️</span>
                <span className="text-sm font-black">{t('weather_title')}</span>
              </div>
              <div className="bg-fuchsia-500 h-24 rounded-3xl flex flex-col items-center justify-center text-white border-b-4 border-fuchsia-700">
                <span className="text-2xl">📰</span>
                <span className="text-sm font-black">{t('news_title')}</span>
              </div>
            </div>
            
            <div className="bg-blue-600 h-20 rounded-2xl flex items-center justify-between px-6 text-white shadow-lg">
              <span className="font-black">{t('video_call')}</span>
              <span className="text-2xl">🎥</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-500 h-20 rounded-2xl flex flex-col items-center justify-center text-white">
                <span className="text-xl">🎙️</span>
                <span className="text-xs font-black">{t('chat')}</span>
              </div>
              <div className="bg-emerald-600 h-20 rounded-2xl flex flex-col items-center justify-center text-white">
                <span className="text-xl">🔍</span>
                <span className="text-xs font-black">{t('vision')}</span>
              </div>
            </div>

            <div className="bg-red-600 h-20 rounded-2xl flex items-center justify-between px-6 text-white border-b-4 border-red-800">
              <div className="flex flex-col items-start">
                <span className="font-black">{t('emergency')}</span>
                <span className="text-[10px] opacity-70">120</span>
              </div>
              <span className="text-2xl">🚑</span>
            </div>
          </div>
        )}

        {currentRoute === AppRoute.REMINDERS && (
          <div className="space-y-3">
            <h5 className="text-lg font-black text-slate-800 mb-2">{t('senior_viewing_meds')}</h5>
            {[1, 2].map(id => (
              <div key={id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💊</span>
                  <span className="font-bold text-slate-700">{t('med_routine')} #{id}</span>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 ${syncData.completed_reminder_ids?.includes(id.toString()) ? 'bg-green-500 border-green-500' : 'border-slate-200'}`}></div>
              </div>
            ))}
          </div>
        )}

        {currentRoute !== AppRoute.HOME && currentRoute !== AppRoute.REMINDERS && (
          <div className="h-40 flex flex-col items-center justify-center bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200">
            <span className="text-3xl mb-2">📱</span>
            <p className="text-sm font-bold text-slate-500">{t('senior_using_module', { module: currentRoute })}</p>
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-blue-500/5 pointer-events-none border-2 border-blue-500/20 rounded-3xl"></div>
    </div>
  );
};

export default SeniorViewMirror;
    