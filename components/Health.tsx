
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Health: React.FC = () => {
  const stepData = [
    { day: '周一', steps: 4200 },
    { day: '周二', steps: 3800 },
    { day: '周三', steps: 5100 },
    { day: '周四', steps: 4600 },
    { day: '周五', steps: 6200 },
    { day: '周六', steps: 5800 },
    { day: '周日', steps: 4500 },
  ];

  const heartRateData = [
    { time: '08:00', rate: 72 },
    { time: '10:00', rate: 78 },
    { time: '12:00', rate: 75 },
    { time: '14:00', rate: 85 },
    { time: '16:00', rate: 74 },
    { time: '18:00', rate: 70 },
    { time: '20:00', rate: 73 },
  ];

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-3xl font-bold text-slate-800 mb-4">健康监测</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-1">今日步数</p>
          <p className="text-4xl font-bold text-blue-600">5,823</p>
          <div className="h-1 bg-slate-100 mt-4 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-[70%]"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-1">心率</p>
          <p className="text-4xl font-bold text-red-500">75 <span className="text-sm">bpm</span></p>
          <p className="text-green-500 text-sm mt-2">● 正常范围</p>
        </div>
      </div>

      {/* Steps Chart */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span>走步趋势</span>
          <span className="text-sm font-normal text-slate-400">最近7天</span>
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stepData}>
              <defs>
                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <Tooltip />
              <Area type="monotone" dataKey="steps" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSteps)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Heart Rate Chart */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span>心率变化</span>
          <span className="text-sm font-normal text-slate-400">今日</span>
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={heartRateData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444'}} activeDot={{r: 8}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
        <p className="text-green-800 font-bold mb-2">医生建议：</p>
        <p className="text-green-700 leading-relaxed">您的健康状况非常稳定。建议傍晚时分多走500步，有助于睡眠。</p>
      </div>
    </div>
  );
};

export default Health;
