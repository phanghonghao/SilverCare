
import React, { useState, useEffect } from 'react';
import { AppRoute, Reminder, Language } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HomeProps {
  setRoute: (route: AppRoute) => void;
  handleGoWeatherNews: (type: 'weather' | 'news') => void;
  reminders: Reminder[];
  hasMedal?: boolean;
}

type PermissionStatus = 'pending' | 'granted' | 'denied';

const GUARD_STORAGE_KEY = 'SILVERCARE_GUARD_ACTIVE';

const Home: React.FC<HomeProps> = ({ setRoute, handleGoWeatherNews, reminders, hasMedal = false }) => {
  const { t, language, setLanguage } = useLanguage();
  const [familyPhone, setFamilyPhone] = useState('13800138000'); 
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('120'); 
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [tempEmergencyPhone, setTempEmergencyPhone] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);

  const [perms, setPerms] = useState<{
    media: PermissionStatus;
    location: PermissionStatus;
    motion: PermissionStatus;
  }>({
    media: 'pending',
    location: 'pending',
    motion: 'pending'
  });

  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('SILVERCARE_FAMILY_PHONE');
    if (savedPhone) setFamilyPhone(savedPhone);
    const savedEmergency = localStorage.getItem('SILVERCARE_EMERGENCY_PHONE');
    if (savedEmergency) setEmergencyPhone(savedEmergency);
    
    const isSetupDone = localStorage.getItem(GUARD_STORAGE_KEY) === 'true';
    setHasCompletedSetup(isSetupDone);

    const checkAllPermissions = async () => {
      const newPerms = { ...perms };
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabel = devices.some(d => (d.kind === 'videoinput' || d.kind === 'audioinput') && d.label !== '');
        if (hasLabel) newPerms.media = 'granted';
      } catch (e) {}

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' } as any);
          if (result.state === 'granted') newPerms.location = 'granted';
          result.onchange = () => {
            if (result.state === 'granted') setPerms(p => ({ ...p, location: 'granted' }));
          };
        } catch (e) {}
      }

      if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
        newPerms.motion = 'granted';
      } 
      setPerms(newPerms);
    };
    checkAllPermissions();
  }, []);

  const handleSavePhone = () => {
    if (tempPhone.trim().length > 2) {
      localStorage.setItem('SILVERCARE_FAMILY_PHONE', tempPhone.trim());
      setFamilyPhone(tempPhone.trim());
      setShowPhoneModal(false);
    }
  };

  const handleSaveEmergencyPhone = () => {
    if (tempEmergencyPhone.trim().length > 2) {
      localStorage.setItem('SILVERCARE_EMERGENCY_PHONE', tempEmergencyPhone.trim());
      setEmergencyPhone(tempEmergencyPhone.trim());
      setShowEmergencyModal(false);
    }
  };

  const requestMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(t => t.stop());
      setPerms(p => ({ ...p, media: 'granted' }));
    } catch (e) { setPerms(p => ({ ...p, media: 'denied' })); }
  };

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setPerms(p => ({ ...p, location: 'granted' })),
      () => setPerms(p => ({ ...p, location: 'denied' })),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const requestMotion = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const res = await (DeviceMotionEvent as any).requestPermission();
        setPerms(p => ({ ...p, motion: res === 'granted' ? 'granted' : 'denied' }));
      } catch (e) { setPerms(p => ({ ...p, motion: 'denied' })); }
    } else {
      setPerms(p => ({ ...p, motion: 'granted' }));
    }
  };

  const allGranted = perms.media === 'granted' && perms.location === 'granted' && perms.motion === 'granted';

  useEffect(() => {
    if (allGranted && !hasCompletedSetup) {
      localStorage.setItem(GUARD_STORAGE_KEY, 'true');
      setHasCompletedSetup(true);
    }
  }, [allGranted, hasCompletedSetup]);

  return (
    <div className="p-4 flex flex-col h-full space-y-4 overflow-y-auto pb-24 relative">
      {hasMedal && (
        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-amber-300 rounded-[30px] p-4 flex items-center justify-between shadow-lg mb-2 text-amber-900">
           <div className="flex items-center gap-3">
              <span className="text-4xl animate-bounce">🎖️</span>
              <div>
                 <p className="font-black text-lg leading-none">今日健康达人</p>
                 <p className="text-amber-700 text-xs font-bold mt-1">已获得“准时用药”荣誉</p>
              </div>
           </div>
        </div>
      )}

      {!hasCompletedSetup && !allGranted && (
        <section className="bg-slate-800 text-white rounded-[30px] p-5 shadow-xl border-2 border-blue-500/30">
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2">🛡️ {t('start_guard')}</h3>
            <div className="grid grid-cols-1 gap-3">
              <PermissionItem label={t('motion_sensor')} status={perms.motion} onClick={requestMotion} />
              <PermissionItem label={t('media_permission')} status={perms.media} onClick={requestMedia} />
              <PermissionItem label={t('location_permission')} status={perms.location} onClick={requestLocation} />
            </div>
          </div>
        </section>
      )}

      {hasCompletedSetup && (
        <div className="bg-white border-2 border-emerald-100 rounded-[30px] p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl animate-pulse">🛡️</div>
          <div className="flex-1">
            <p className="text-emerald-800 font-black text-lg leading-tight">{t('monitoring_on')}</p>
            <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">{t('system_running')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => handleGoWeatherNews('weather')} className="bg-yellow-400 text-yellow-900 rounded-[40px] p-6 flex flex-col items-center justify-center shadow-xl active-scale h-40 border-b-8 border-yellow-600">
          <span className="text-5xl mb-2">🌤️</span>
          <span className="text-2xl font-black">{t('weather')}</span>
        </button>
        <button onClick={() => handleGoWeatherNews('news')} className="bg-fuchsia-500 text-white rounded-[40px] p-6 flex flex-col items-center justify-center shadow-xl active-scale h-40 border-b-8 border-fuchsia-700">
          <span className="text-5xl mb-2">📰</span>
          <span className="text-2xl font-black">{t('news')}</span>
        </button>
      </div>

      <button onClick={() => setRoute(AppRoute.LIVE_CALL)} className="w-full bg-blue-600 text-white rounded-[35px] p-6 flex items-center justify-between shadow-xl active-scale">
        <div className="flex flex-col items-start ml-2"><span className="text-3xl font-black mb-1">{t('video_call')}</span></div>
        <div className="bg-white/20 p-4 rounded-full text-4xl animate-bounce">🎥</div>
      </button>

      <div className="grid grid-cols-2 gap-4">
        {[
          { route: AppRoute.CHAT, label: t('chat'), icon: '🎙️', color: 'bg-indigo-500' },
          { route: AppRoute.VISION, label: t('vision'), icon: '🔍', color: 'bg-emerald-600' },
          { route: AppRoute.FAMILY, label: t('family'), icon: '❤️', color: 'bg-rose-500' },
          { route: AppRoute.REMINDERS, label: t('meds'), icon: '💊', color: 'bg-amber-500' },
        ].map((item) => (
          <button key={item.route} onClick={() => setRoute(item.route)} className={`${item.color} text-white rounded-[40px] p-4 flex flex-col items-center justify-center space-y-2 shadow-lg active-scale h-32`}>
            <span className="text-4xl">{item.icon}</span>
            <span className="text-xl font-black">{item.label}</span>
          </button>
        ))}
      </div>

      <button onClick={() => window.location.href = `tel:${emergencyPhone}`} className="w-full bg-red-600 text-white rounded-[40px] p-6 flex items-center justify-between shadow-xl mt-2 animate-pulse border-b-8 border-red-800">
        <div className="flex flex-col items-start ml-4 text-left"><span className="text-3xl font-black">{t('emergency')}</span></div>
        <div className="bg-white/20 p-5 rounded-full text-5xl mr-2">🚑</div>
      </button>

      <div className="mt-8 pt-6 pb-12">
        <p className="text-center text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">⚙️ {t('settings_phone')}</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => { setTempPhone(familyPhone); setShowPhoneModal(true); }} className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-4 rounded-3xl text-sm font-bold active:scale-95">👨‍👩‍👧 {t('family_phone')}</button>
          <button onClick={() => { setTempEmergencyPhone(emergencyPhone); setShowEmergencyModal(true); }} className="bg-white border-2 border-red-100 text-red-600 px-4 py-4 rounded-3xl text-sm font-bold active:scale-95">🚑 {t('emergency_phone')}</button>
        </div>
        <button 
          onClick={() => setRoute(AppRoute.TEST)}
          className="w-full bg-slate-800 text-white py-4 rounded-3xl text-sm font-black border-2 border-blue-500 shadow-lg active-scale"
        >
          {t('enter_test_mode')}
        </button>

        <button 
           onClick={() => setShowLangModal(true)}
           className="w-full mt-4 bg-white text-slate-500 py-4 rounded-3xl text-sm font-bold border-2 border-slate-200 active-scale flex items-center justify-center gap-2"
        >
           <span>🌐</span>
           <span>{t('switch_lang')}: {t('lang_name')}</span>
        </button>
      </div>

      {showPhoneModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 text-slate-800 text-center">👨‍👩‍👧 {t('family_phone')}</h3>
            <input type="tel" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full bg-slate-100 rounded-2xl p-5 text-4xl font-bold mb-6 text-center" />
            <div className="flex gap-4"><button onClick={() => setShowPhoneModal(false)} className="flex-1 py-4 text-slate-500 font-bold">取消</button><button onClick={handleSavePhone} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold">保存</button></div>
          </div>
        </div>
      )}

      {showEmergencyModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl border-4 border-red-500">
            <h3 className="text-2xl font-bold mb-4 text-red-600 text-center">🚑 {t('emergency_phone')}</h3>
            <input type="tel" value={tempEmergencyPhone} onChange={(e) => setTempEmergencyPhone(e.target.value)} className="w-full bg-red-50 rounded-2xl p-5 text-4xl font-bold mb-6 text-center text-red-600" />
            <div className="flex gap-4"><button onClick={() => setShowEmergencyModal(false)} className="flex-1 py-4 text-slate-500 font-bold">取消</button><button onClick={handleSaveEmergencyPhone} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold">保存</button></div>
          </div>
        </div>
      )}

      {showLangModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-slate-800 text-center">🌐 {t('switch_lang')}</h3>
            <div className="space-y-3">
              {[
                { code: 'zh-CN', label: '简体中文' },
                { code: 'zh-TW', label: '繁體中文' },
                { code: 'en', label: 'English' }
              ].map((option) => (
                <button 
                  key={option.code}
                  onClick={() => { setLanguage(option.code as Language); setShowLangModal(false); }}
                  className={`w-full py-4 rounded-2xl font-bold text-lg active-scale border-2 flex items-center justify-between px-6 ${
                    language === option.code 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-slate-50 text-slate-600 border-slate-100'
                  }`}
                >
                  <span>{option.label}</span>
                  {language === option.code && <span>✓</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setShowLangModal(false)} className="w-full mt-6 py-4 text-slate-400 font-bold active-scale">
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PermissionItem = ({ label, status, onClick }: { label: string, status: PermissionStatus, onClick: () => void }) => {
  const { t } = useLanguage();
  const isGranted = status === 'granted';
  return (
    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
      <span className="text-lg font-bold">{label}</span>
      <button onClick={onClick} disabled={isGranted} className={`px-5 py-2 rounded-full font-bold text-sm ${isGranted ? 'bg-green-500' : 'bg-blue-600 active:scale-95'}`}>{isGranted ? t('permission_enabled') : t('permission_click_enable')}</button>
    </div>
  );
};

export default Home;
    