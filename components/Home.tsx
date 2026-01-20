
import React from 'react';
import { AppRoute, Reminder } from '../types';

interface HomeProps {
  setRoute: (route: AppRoute) => void;
  reminders: Reminder[];
}

const Home: React.FC<HomeProps> = ({ setRoute, reminders }) => {
  const nextReminder = reminders.find(r => !r.completed);

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Message */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">早上好，张爷爷</h2>
        <p className="text-xl text-slate-500">今天天气晴朗，适宜在楼下散步。</p>
      </section>

      {/* Emergency Call Button */}
      <button className="w-full bg-red-500 hover:bg-red-600 text-white rounded-3xl p-6 flex items-center justify-between active-scale transition-colors shadow-lg shadow-red-200">
        <div className="text-left">
          <p className="text-2xl font-bold">紧急呼叫</p>
          <p className="opacity-90">遇到困难请点击这里</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full text-4xl">🚨</div>
      </button>

      {/* Next Reminder Highlight */}
      <section className="bg-blue-50 border-l-8 border-blue-500 rounded-r-3xl p-6 shadow-sm">
        <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
          <span>⏰</span> 下一个提醒
        </h3>
        {nextReminder ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800">{nextReminder.title}</p>
              <p className="text-xl text-slate-500">时间：{nextReminder.time}</p>
            </div>
            <button 
              onClick={() => setRoute(AppRoute.REMINDERS)}
              className="bg-blue-600 text-white px-6 py-2 rounded-full text-lg font-bold"
            >
              去查看
            </button>
          </div>
        ) : (
          <p className="text-lg text-slate-500">太棒了！今天的任务都完成了。</p>
        )}
      </section>

      {/* Voice Assistant Shortcut */}
      <section 
        onClick={() => setRoute(AppRoute.CHAT)}
        className="bg-indigo-600 text-white rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer active-scale shadow-xl"
      >
        <div className="bg-white/20 p-6 rounded-full mb-4 animate-bounce">
          <span className="text-5xl">🎙️</span>
        </div>
        <p className="text-2xl font-bold">点我找小玲聊天</p>
        <p className="text-lg opacity-80 mt-2">想听故事或者查天气？</p>
      </section>
    </div>
  );
};

export default Home;
