
import React, { useState, useEffect } from 'react';
import { fetchWeatherOrNews, playTTS, checkQuotaStatus, getCachedData } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface WeatherNewsViewProps {
  type: 'weather' | 'news';
  onBack: () => void;
}

const WeatherNewsView: React.FC<WeatherNewsViewProps> = ({ type, onBack }) => {
  const { t, language } = useLanguage();
  const [loadingStep, setLoadingStep] = useState<'locating' | 'fetching' | 'done'>('locating');
  const [content, setContent] = useState('');
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const cached = getCachedData(type);
      if (cached) {
        if (!isMounted) return;
        setContent(cached.text);
        setGroundingChunks(cached.groundingChunks);
        setLoadingStep('done');
        setIsFromCache(true);
        playTTS(cached.text);
        return;
      }

      if (checkQuotaStatus()) {
        const quotaMsg = language === 'en' ? "Xiao Ling is taking a break. Try later." : "小玲正在休息，请等会儿再问我。";
        setError(quotaMsg);
        setLoadingStep('done');
        return;
      }

      setLoadingStep('locating');
      setError('');
      
      const getPosition = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
             reject(new Error("NO_GPS"));
             return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 4000, 
            enableHighAccuracy: false 
          });
        });
      };

      try {
        let lat = 0, lng = 0;
        try {
          const pos = await getPosition();
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (e) {}

        if (!isMounted) return;
        setLoadingStep('fetching');

        const result = await fetchWeatherOrNews(type, lat, lng);
        
        if (!isMounted) return;
        setContent(result.text);
        setGroundingChunks(result.groundingChunks);
        setStatusMsg(result.statusMsg || '');
        setLoadingStep('done');
        setIsFromCache(false);
        
        if (result.text) {
          await playTTS(result.text);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(language === 'en' ? "Connection error." : "网络有点不给力。");
        setLoadingStep('done');
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [type, language]);

  const getStepText = () => {
    if (loadingStep === 'locating') return language === 'en' ? "Locating you..." : "正在看您在哪里...";
    if (loadingStep === 'fetching') {
      return statusMsg || (language === 'en' ? "Searching in English..." : "正在查询最新信息...");
    }
    return "";
  };

  return (
    <div className={`flex flex-col h-full p-6 ${type === 'weather' ? 'bg-yellow-50' : 'bg-fuchsia-50'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-4xl font-black ${type === 'weather' ? 'text-yellow-700' : 'text-fuchsia-800'}`}>
          {type === 'weather' ? `🌤️ ${t('weather_title')}` : `📰 ${t('news_title')}`}
        </h2>
        <button 
          onClick={onBack}
          className="bg-white px-6 py-2 rounded-full font-bold text-slate-600 active-scale shadow-sm border border-slate-200"
        >
          {t('back')}
        </button>
      </div>

      <div className="flex-1 bg-white rounded-[40px] p-8 shadow-xl overflow-y-auto border-2 border-slate-100 flex flex-col">
        {loadingStep !== 'done' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className={`w-20 h-20 border-8 ${type === 'weather' ? 'border-yellow-400' : 'border-fuchsia-500'} border-t-transparent rounded-full animate-spin`}></div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black text-slate-800 animate-pulse leading-relaxed">
                {getStepText()}
              </p>
              {loadingStep === 'fetching' && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Language Anchor: {language.toUpperCase()}
                </p>
              )}
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-6xl mb-6">🏜️</p>
            <p className="text-2xl text-slate-600 font-bold leading-relaxed">{error}</p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {isFromCache && (
               <div className="bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 font-bold">
                 ⚡ {language === 'en' ? 'Synced Latest' : '已同步最新内容'}
               </div>
            )}
            <p className="text-3xl leading-relaxed text-slate-800 font-black whitespace-pre-wrap">
              {content}
            </p>
            
            {groundingChunks && groundingChunks.length > 0 && (
              <div className="mt-4 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">{t('ref_source')}</p>
                <div className="flex flex-col gap-3">
                  {groundingChunks.slice(0, 3).map((chunk, idx) => chunk.web && (
                    <a 
                      key={idx} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-lg text-blue-600 font-bold flex items-center gap-2 hover:underline"
                    >
                      <span className="flex-shrink-0">🔗</span>
                      <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-slate-400 text-sm font-bold opacity-60">Xiao Ling Intelligence Drive</p>
      </div>
    </div>
  );
};

export default WeatherNewsView;
