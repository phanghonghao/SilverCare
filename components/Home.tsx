
import React, { useState, useEffect } from 'react';
import { AppRoute, Reminder } from '../types';
import { getApiKeyStatus, saveUserApiKey } from '../services/geminiService';

interface HomeProps {
  setRoute: (route: AppRoute) => void;
  reminders: Reminder[];
}

type PermissionStatus = 'pending' | 'granted' | 'denied';

const Home: React.FC<HomeProps> = ({ setRoute, reminders }) => {
  // Key 相关的状态
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');
  
  // 电话号码相关的状态 (亲情)
  const [familyPhone, setFamilyPhone] = useState('13800138000'); 
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [tempPhone, setTempPhone] = useState('');

  // 电话号码相关的状态 (紧急)
  const [emergencyPhone, setEmergencyPhone] = useState('120'); 
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [tempEmergencyPhone, setTempEmergencyPhone] = useState('');

  const [perms, setPerms] = useState<{
    media: PermissionStatus;
    location: PermissionStatus;
    motion: PermissionStatus;
  }>({
    media: 'pending',
    location: 'pending',
    motion: 'pending'
  });

  const keyStatus = getApiKeyStatus();

  useEffect(() => {
    // 加载保存的亲情号码
    const savedPhone = localStorage.getItem('SILVERCARE_FAMILY_PHONE');
    if (savedPhone) {
      setFamilyPhone(savedPhone);
    }

    // 加载保存的紧急号码
    const savedEmergency = localStorage.getItem('SILVERCARE_EMERGENCY_PHONE');
    if (savedEmergency) {
      setEmergencyPhone(savedEmergency);
    } else if (savedPhone) {
      // 如果没设置紧急号码，默认使用亲情号码
      setEmergencyPhone(savedPhone);
    }
  }, []);

  const handleSaveKey = () => {
    if (saveUserApiKey(tempKey)) {
      alert("密钥保存成功！");
      setShowKeyModal(false);
      window.location.reload(); 
    } else {
      alert("请输入有效的密钥。");
    }
  };

  const handleSavePhone = () => {
    if (tempPhone.trim().length > 2) {
      localStorage.setItem('SILVERCARE_FAMILY_PHONE', tempPhone.trim());
      setFamilyPhone(tempPhone.trim());
      setShowPhoneModal(false);
      alert(`已设置亲情号码为：${tempPhone}`);
    } else {
      alert("请输入有效的电话号码");
    }
  };

  const handleSaveEmergencyPhone = () => {
    if (tempEmergencyPhone.trim().length > 2) {
      localStorage.setItem('SILVERCARE_EMERGENCY_PHONE', tempEmergencyPhone.trim());
      setEmergencyPhone(tempEmergencyPhone.trim());
      setShowEmergencyModal(false);
      alert(`已设置紧急求助号码为：${tempEmergencyPhone}`);
    } else {
      alert("请输入有效的电话号码");
    }
  };

  const requestMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(t => t.stop());
      setPerms(p => ({ ...p, media: 'granted' }));
    } catch (e) {
      setPerms(p => ({ ...p, media: 'denied' }));
    }
  };

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setPerms(p => ({ ...p, location: 'granted' })),
      () => setPerms(p => ({ ...p, location: 'denied' })),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const allGranted = perms.media === 'granted' && perms.location === 'granted';

  return (
    <div className="p-4 flex flex-col h-full space-y-4 overflow-y-auto pb-24">
      
      {!allGranted && (
        <section className="bg-slate-800 text-white rounded-2xl p-3 shadow-md mb-2">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-bold whitespace-nowrap">🛡️ 需开启权限：</span>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              <PermissionItem label="视频" status={perms.media} onClick={requestMedia} />
              <PermissionItem label="定位" status={perms.location} onClick={requestLocation} />
            </div>
          </div>
        </section>
      )}

      {/* 核心視訊通話按鈕 (AI) - 高度改小 */}
      <button 
        onClick={() => setRoute(AppRoute.LIVE_CALL)}
        className={`w-full bg-blue-600 text-white rounded-[35px] p-5 flex items-center justify-between shadow-xl active-scale transition-all ${!allGranted ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="flex flex-col items-start ml-2">
          <span className="text-3xl font-black mb-1">小玲視訊陪伴</span>
          <span className="text-blue-100 text-sm font-bold">面對面即時聊天</span>
        </div>
        <div className="bg-white/20 p-3 rounded-full text-3xl mr-1 animate-bounce">🎬</div>
      </button>

      {/* 2鍵視訊通話 (原生跳轉) - 親情號碼 */}
      <button 
        onClick={() => {
          window.location.href = `tel:${familyPhone}`;
        }}
        className="w-full bg-green-600 text-white rounded-[40px] p-6 flex items-center justify-between shadow-xl active-scale"
      >
        <div className="flex flex-col items-start ml-2">
          <span className="text-3xl font-black mb-1">呼叫兒女 (電話)</span>
          <span className="text-green-100 text-lg font-bold">撥打：{familyPhone}</span>
        </div>
        <div className="bg-white/20 p-4 rounded-full text-4xl mr-2">📞</div>
      </button>

      {/* 功能网格 */}
      <div className={`grid grid-cols-2 gap-4 transition-all ${!allGranted ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        {[
          { route: AppRoute.CHAT, label: '文字聊天', icon: '🎙️', color: 'bg-indigo-500' },
          { route: AppRoute.VISION, label: '幫我看看', icon: '🔍', color: 'bg-emerald-600' },
          { route: AppRoute.FAMILY, label: '親情留言', icon: '❤️', color: 'bg-rose-500' },
          { route: AppRoute.REMINDERS, label: '吃藥提醒', icon: '💊', color: 'bg-amber-500' },
        ].map((item) => (
          <button
            key={item.route}
            onClick={() => setRoute(item.route)}
            className={`${item.color} text-white rounded-[40px] p-4 flex flex-col items-center justify-center space-y-2 shadow-lg active-scale h-32`}
          >
            <span className="text-4xl">{item.icon}</span>
            <span className="text-xl font-black">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 紧急救助 - 独立紧急号码 */}
      <button 
        onClick={() => window.location.href = `tel:${emergencyPhone}`}
        className="w-full bg-red-600 text-white rounded-[40px] p-6 flex items-center justify-between shadow-xl mt-2 mb-8 animate-pulse"
      >
        <div className="flex flex-col items-start ml-4">
          <span className="text-3xl font-black">緊急救助</span>
          <span className="text-red-200 text-sm font-bold mt-1">呼叫：{emergencyPhone}</span>
        </div>
        <div className="bg-white/20 p-4 rounded-full text-4xl mr-2">🚨</div>
      </button>

      {/* 底部设置区 */}
      <div className="mt-8 border-t-2 border-slate-100 pt-6 pb-4">
        <p className="text-center text-slate-400 text-sm font-bold mb-4 uppercase tracking-widest">⚙️ 設置與管理</p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setTempPhone(familyPhone);
                setShowPhoneModal(true);
              }}
              className="flex-1 bg-white border-2 border-slate-200 text-slate-600 px-4 py-3 rounded-2xl text-sm font-bold shadow-sm active:scale-95"
            >
              📞 設置親情號碼
            </button>
            <button 
              onClick={() => {
                setTempEmergencyPhone(emergencyPhone);
                setShowEmergencyModal(true);
              }}
              className="flex-1 bg-white border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold shadow-sm active:scale-95"
            >
              🚨 設置緊急號碼
            </button>
          </div>
          <button 
            onClick={() => setShowKeyModal(true)}
            className={`w-full px-4 py-3 rounded-2xl text-sm font-bold shadow-sm active:scale-95 border-2 ${
              keyStatus.configured ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
            }`}
          >
            {keyStatus.configured ? '✅ 已配置 AI 密鑰' : '⚠️ 配置 AI 密鑰 (必填)'}
          </button>
        </div>
      </div>

      {/* 亲情号码设置弹窗 */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-bounce-in">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">📞 设置亲情号码</h3>
            <p className="text-slate-500 mb-6 text-lg">
              这个号码将用于绿色的“呼叫兒女”按钮。
            </p>
            <input
              type="tel"
              value={tempPhone}
              onChange={(e) => setTempPhone(e.target.value)}
              placeholder="输入号码"
              className="w-full bg-slate-100 rounded-2xl p-4 text-3xl font-bold mb-6 border-2 border-slate-200 focus:border-blue-500 outline-none text-center tracking-wider"
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setShowPhoneModal(false)}
                className="flex-1 py-4 text-slate-500 font-bold text-xl"
              >
                取消
              </button>
              <button 
                onClick={handleSavePhone}
                className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg active-scale"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 紧急号码设置弹窗 */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-bounce-in border-4 border-red-500">
            <h3 className="text-2xl font-bold mb-4 text-red-600">🚨 设置紧急号码</h3>
            <p className="text-slate-500 mb-6 text-lg">
              这个号码将用于红色的“紧急救助”按钮以及摔倒自动报警。
            </p>
            <input
              type="tel"
              value={tempEmergencyPhone}
              onChange={(e) => setTempEmergencyPhone(e.target.value)}
              placeholder="例如 120 或子女号"
              className="w-full bg-red-50 rounded-2xl p-4 text-3xl font-bold mb-6 border-2 border-red-200 focus:border-red-500 outline-none text-center tracking-wider text-red-600"
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setShowEmergencyModal(false)}
                className="flex-1 py-4 text-slate-500 font-bold text-xl"
              >
                取消
              </button>
              <button 
                onClick={handleSaveEmergencyPhone}
                className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg active-scale"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 密钥配置弹窗 */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-bounce-in">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">配置 Gemini 密钥</h3>
            <p className="text-slate-500 mb-6 text-lg leading-relaxed">
              请访问 Google AI Studio 获取 API Key：
            </p>
            <textarea
              rows={3}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="粘贴 AIza... 密钥"
              className="w-full bg-slate-100 rounded-2xl p-4 text-lg mb-6 border-2 border-slate-200 focus:border-blue-500 outline-none"
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setShowKeyModal(false)}
                className="flex-1 py-4 text-slate-500 font-bold text-xl"
              >
                取消
              </button>
              <button 
                onClick={handleSaveKey}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg active-scale"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PermissionItem = ({ label, status, onClick }: { label: string, status: PermissionStatus, onClick: () => void }) => {
  const isGranted = status === 'granted';
  return (
    <div className="flex-1 flex items-center justify-between bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 min-w-[100px]">
      <span className="text-sm font-medium">{label}</span>
      <button 
        onClick={onClick}
        disabled={isGranted}
        className={`px-3 py-1 rounded-full font-bold text-xs ${isGranted ? 'bg-green-500' : 'bg-blue-600'}`}
      >
        {isGranted ? '已开' : '开启'}
      </button>
    </div>
  );
};

export default Home;
