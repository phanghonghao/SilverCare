
import React from 'react';
import { Reminder } from '../types';

interface RemindersProps {
  reminders: Reminder[];
  onToggle: (id: string) => void;
}

const Reminders: React.FC<RemindersProps> = ({ reminders, onToggle }) => {
  const getIcon = (type: Reminder['type']) => {
    switch (type) {
      case 'med': return '💊';
      case 'water': return '💧';
      case 'exercise': return '👟';
      case 'social': return '📞';
      default: return '⏰';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">用药与提醒</h2>
        <button className="bg-slate-200 text-slate-600 px-4 py-2 rounded-full font-bold">
          + 添加
        </button>
      </div>

      <div className="space-y-4">
        {reminders.map((reminder) => (
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
                <p className="text-xl text-slate-500">⏰ {reminder.time}</p>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-2xl ${
              reminder.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
            }`}>
              {reminder.completed ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-3xl">
        <p className="text-xl text-blue-800 font-bold mb-2">💡 小提示：</p>
        <p className="text-lg text-blue-600 leading-relaxed">
          完成任务后，点击方框即可标记。按时吃药能让身体更强壮哦！
        </p>
      </div>
    </div>
  );
};

export default Reminders;
