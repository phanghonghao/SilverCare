
import React, { useState, useEffect } from 'react';
import { HealthLog, MedRecord, SyncData, Alarm } from '../types';
import { DataSyncManager, getSafetyLogs } from '../services/geminiService';
import SeniorViewMirror from './SeniorViewMirror';
import { useLanguage } from '../contexts/LanguageContext';

const GuardianDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [medRecords, setMedRecords] = useState<MedRecord[]>([]);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null); // New state for video
  const [isOnline, setIsOnline] = useState(false);
  const [showMirror, setShowMirror] = useState(false);
  const [showAlarmConfig, setShowAlarmConfig] = useState(false);

  const refreshData = () => {
    const data = DataSyncManager.getLatestSyncData();
    const savedLogs = getSafetyLogs();
    const savedMeds = JSON.parse(localStorage.getItem('SILVERCARE_MED_LOGS') || '[]');
    
    setSyncData(data);
    setLogs(savedLogs);
    setMedRecords(savedMeds);
    setIsOnline(data && Date.now() - data.last_heartbeat < 15000);
  };

  useEffect(() => {
    refreshData();
    const unsub = DataSyncManager.subscribe(refreshData);
    const timer = setInterval(refreshData, 5000); 
    return () => { unsub(); clearInterval(timer); };
  }, []);

  // 1. 紧急跌倒弹窗逻辑
  const isFalling = syncData?.is_falling;

  const handleUpdateAlarm = (newAlarms: Alarm[]) => {
    DataSyncManager.pushConfig({ alarms: newAlarms });
  };

  return (
    <div className="h-full bg-slate-50 overflow-y-auto pb-20 font-sans relative">
      {/* 核心紧急报警弹窗 */}
      {isFalling && (
        <div className="fixed inset-0 z-[2000] bg-red-600 flex flex-col items-center justify-center p-8 text-white text-center animate-pulse">
           <div className="text-9xl mb-8">🚨</div>
           <h2 className="text-5xl font-black mb-4">{t('alert_highest_level')}</h2>
           <p className="text-2xl font-bold mb-10">{t('alert_fall_desc')}</p>
           <div className="w-full space-y-4">
              <button onClick={() => window.location.href='tel:120'} className="w-full bg-white text-red-600 py-6 rounded-[30px] text-3xl font-black shadow-2xl">{t('call_120')}</button>
              <button onClick={() => DataSyncManager.pushStatus({ is_falling: false })} className="w-full bg-red-800 py-4 rounded-[30px] text-xl font-bold">{t('confirm_safety')}</button>
           </div>
        </div>
      )}

      <header className="bg-white px-6 pt-12 pb-6 shadow-sm flex justify-between items-end border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{t('dashboard_title')}</h2>
          <p className="text-slate-400 text-sm">{t('monitoring_target')}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-4 py-1.5 rounded-full text-xs font-black border transition-all ${
            isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'
          }`}>
            {isOnline ? t('parent_online') : t('connection_lost')}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 快速导航卡片 */}
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => setShowMirror(!showMirror)} className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex flex-col items-center gap-2 active-scale">
              <span className="text-3xl">{showMirror ? '📊' : '📱'}</span>
              <span className="text-xs font-black text-slate-600">{showMirror ? t('nav_data') : t('nav_mirror')}</span>
           </button>
           <button onClick={() => setShowAlarmConfig(true)} className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex flex-col items-center gap-2 active-scale">
              <span className="text-3xl">⏰</span>
              <span className="text-xs font-black text-slate-600">{t('nav_alarm')}</span>
           </button>
        </div>

        {showMirror ? (
          <SeniorViewMirror syncData={syncData} />
        ) : (
          <>
            {/* 状态总览 */}
            <section className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <div>
                     <p className="text-slate-400 text-[10px] font-black uppercase">{t('parent_location')}</p>
                     <p className="text-lg font-black text-slate-800">{t('location_region')}</p>
                  </div>
               </div>
               <button className="text-blue-600 font-bold text-sm">{t('view_map')}</button>
            </section>

            {/* 用药存证 */}
            <section className="bg-white rounded-[35px] p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center justify-between">
                <span>💊 {t('med_stream')}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full font-bold">{t('synced_photos')}</span>
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {medRecords.length === 0 ? (
                  <p className="text-slate-400 text-sm italic py-4">{t('no_med_records')}</p>
                ) : (
                  medRecords.map(record => (
                    <div key={record.id} className="min-w-[150px] bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <div 
                        onClick={() => {
                          if (record.videoData) setSelectedVideo(record.videoData);
                          else if (record.evidenceImage) setSelectedImg(record.evidenceImage);
                        }}
                        className="w-full h-28 bg-slate-200 rounded-xl mb-2 overflow-hidden cursor-pointer relative group"
                      >
                        {record.evidenceImage ? (
                          <img src={`data:image/jpeg;base64,${record.evidenceImage}`} className="w-full h-full object-cover" alt="Med" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">{t('no_image')}</div>
                        )}
                        
                        {/* 视频标记 */}
                        {record.videoData && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                             <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center pl-1 shadow-md">
                               <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-blue-600 border-b-[5px] border-b-transparent"></div>
                             </div>
                          </div>
                        )}

                        <div className="absolute top-2 right-2 bg-black/40 px-2 py-0.5 rounded-full text-[8px] text-white">
                          {record.videoData ? '视频存证' : t('proof_photo')}
                        </div>
                      </div>
                      <p className="text-xs font-black text-slate-700">{record.medName}</p>
                      <p className="text-[10px] text-slate-400">{record.time}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* 安全日志 */}
            <section className="bg-white rounded-[35px] p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-4">🛡️ {t('safety_logs')}</h3>
              <div className="space-y-4">
                {logs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex gap-4 items-start border-l-2 border-slate-100 pl-4">
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-700">{log.detail}</p>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* 远程闹钟配置弹窗 */}
      {showAlarmConfig && (
        <div className="fixed inset-0 z-[1100] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-bounce-in">
              <h3 className="text-2xl font-black mb-6 text-slate-800">{t('remote_alarm_title')}</h3>
              <p className="text-slate-400 mb-6 text-sm">{t('remote_alarm_desc')}</p>
              <div className="space-y-4 mb-8">
                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-blue-800">{t('current_alarms')}</p>
                       <p className="text-xs text-blue-600">{t('alarm_config_count', { count: 1 })}</p>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold">{t('modify')}</button>
                 </div>
              </div>
              <button onClick={() => setShowAlarmConfig(false)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold">{t('back_to_dashboard')}</button>
           </div>
        </div>
      )}

      {selectedImg && !selectedVideo && (
        <div className="fixed inset-0 z-[1200] bg-black/95 flex flex-col items-center justify-center p-6" onClick={() => setSelectedImg(null)}>
          <img src={`data:image/jpeg;base64,${selectedImg}`} className="w-full rounded-[40px] shadow-2xl border-2 border-white/20" alt="Preview" />
          <p className="text-white mt-8 text-xl font-black">{t('original_image')}</p>
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 z-[1200] bg-black/95 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg bg-black rounded-[40px] overflow-hidden border-2 border-slate-700 shadow-2xl relative">
             <video 
               src={`data:video/webm;base64,${selectedVideo}`} 
               controls 
               autoPlay 
               className="w-full h-auto"
             />
             <button 
               onClick={() => setSelectedVideo(null)} 
               className="absolute top-4 right-4 text-white bg-black/50 w-10 h-10 rounded-full font-bold border border-white/20"
             >✕</button>
          </div>
          <p className="text-white mt-8 text-xl font-black">📹 5秒服药录像回放</p>
        </div>
      )}
    </div>
  );
};

export default GuardianDashboard;
