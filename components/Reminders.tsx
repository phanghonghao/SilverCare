
import React, { useState } from 'react';
import { Reminder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface RemindersProps {
  reminders: Reminder[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onAdd: (time: string, title: string, type: Reminder['type']) => void;
  onDelete: (id: string) => void;
}

const Reminders: React.FC<RemindersProps> = ({ reminders, onToggle, onBack, onAdd, onDelete }) => {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  
  // Modal State
  const [newTime, setNewTime] = useState('08:00');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Reminder['type']>('med');

  const getIcon = (type: Reminder['type']) => {
    switch (type) {
      case 'med': return '💊';
      case 'water': return '💧';
      case 'exercise': return '👟';
      case 'social': return '📞';
      default: return '⏰';
    }
  };

  const types: { id: Reminder['type'], label: string }[] = [
    { id: 'med', label: '吃药' },
    { id: 'water', label: '喝水' },
    { id: 'exercise', label: '运动' },
    { id: 'social', label: '电话' }
  ];

  const handleSave = () => {
    if (newTime && newTitle.trim()) {
      onAdd(newTime, newTitle, newType);
      setShowModal(false);
      // Reset
      setNewTitle('');
      setNewType('med');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">{t('reminders_title')}</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-md active-scale"
          >
            {t('add_btn')}
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
        {reminders.length === 0 ? (
          <div className="text-center p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <span className="text-4xl opacity-30">📝</span>
             <p className="text-slate-400 font-bold mt-2">暂无提醒，点击右上角添加</p>
          </div>
        ) : (
          reminders.map((reminder) => (
            <div 
              key={reminder.id}
              onClick={() => onToggle(reminder.id)}
              className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between cursor-pointer active-scale ${
                reminder.completed 
                  ? 'bg-slate-100 border-slate-200 grayscale opacity-60' 
                  : 'bg-white border-white shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`text-4xl p-4 rounded-2xl ${reminder.completed ? 'bg-slate-200' : 'bg-blue-50'}`}>
                  {getIcon(reminder.type)}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${reminder.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {reminder.title}
                  </p>
                  <p className="text-xl text-slate-500 font-time">⏰ {reminder.time}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-2xl ${
                  reminder.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                }`}>
                  {reminder.completed ? '✓' : ''}
                </div>
                {/* 删除按钮 */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // 防止触发完成切换
                    onDelete(reminder.id);
                  }}
                  className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xl hover:bg-red-200 active:scale-95 transition-colors shadow-sm"
                  aria-label="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-3xl">
        <p className="text-xl text-blue-800 font-bold mb-2">{t('tip_title')}</p>
        <p className="text-lg text-blue-600 leading-relaxed">
          {t('tip_content')}
        </p>
      </div>

      {/* 添加提醒的弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-bounce-in">
            <h3 className="text-2xl font-bold mb-6 text-center text-slate-800">📝 添加新提醒</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-slate-500 mb-2 font-bold">选择时间</label>
                <input 
                  type="time" 
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full text-5xl font-bold p-4 bg-slate-100 rounded-2xl text-center border-none focus:ring-2 focus:ring-blue-500 font-time"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-2 font-bold">提醒内容 (如: 吃药)</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="请输入内容..."
                  className="w-full text-xl p-4 bg-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-2 font-bold">类型</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {types.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setNewType(t.id)}
                      className={`flex-1 py-3 px-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                        newType === t.id 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {getIcon(t.id)} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-4 text-slate-500 font-bold active-scale"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!newTitle.trim()}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active-scale disabled:opacity-50"
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

export default Reminders;
