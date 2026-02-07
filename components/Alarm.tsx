
import React, { useState } from 'react';
import { Alarm } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AlarmProps {
  alarms: Alarm[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (time: string, label: string) => void;
  onBack: () => void;
}

const AlarmComponent: React.FC<AlarmProps> = ({ alarms, onToggle, onDelete, onAdd, onBack }) => {
  const { t } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [newTime, setNewTime] = useState("08:00");
  const [newLabel, setNewLabel] = useState(t('label_wake'));

  const commonTimes = [
    { t: "07:00", l: t('label_wake') },
    { t: "12:30", l: t('label_nap') },
    { t: "21:00", l: t('label_rest') }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">{t('alarm_title')}</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-md active-scale"
          >
            {t('add_alarm')}
          </button>
          <button 
            onClick={onBack}
            className="bg-slate-100 px-6 py-2 rounded-full font-bold text-slate-600 active-scale"
          >
            {t('back')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {alarms.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-xl">{t('no_alarm')}</p>
          </div>
        ) : (
          alarms.map((alarm) => (
            <div 
              key={alarm.id}
              className={`p-6 rounded-3xl border-2 flex items-center justify-between transition-all ${
                alarm.enabled ? 'bg-white border-blue-100 shadow-md' : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">{alarm.label}</span>
                </div>
                <p className={`text-6xl font-bold font-time ${alarm.enabled ? 'text-slate-800' : 'text-slate-400'}`}>
                  {alarm.time}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onToggle(alarm.id)}
                  className={`w-20 h-10 rounded-full relative transition-colors duration-300 ${
                    alarm.enabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-md transition-all duration-300 ${
                    alarm.enabled ? 'left-11' : 'left-1'
                  }`}></div>
                </button>
                <button 
                  onClick={() => onDelete(alarm.id)}
                  className="text-2xl p-2 text-slate-300 hover:text-red-500"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-bounce-in">
            <h3 className="text-2xl font-bold mb-6 text-center text-slate-800">{t('set_alarm')}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-slate-500 mb-2">{t('select_time')}</label>
                <input 
                  type="time" 
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full text-5xl font-bold p-4 bg-slate-100 rounded-2xl text-center border-none focus:ring-2 focus:ring-blue-500 font-time"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-2">{t('alarm_label')}</label>
                <input 
                  type="text" 
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full text-xl p-4 bg-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {commonTimes.map(ct => (
                  <button 
                    key={ct.t}
                    onClick={() => { setNewTime(ct.t); setNewLabel(ct.l); }}
                    className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-bold"
                  >
                    {ct.l} {ct.t}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-500 font-bold">
                  {t('cancel')}
                </button>
                <button 
                  onClick={() => { onAdd(newTime, newLabel); setShowAdd(false); }}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active-scale"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlarmComponent;
