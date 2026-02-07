
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface VoiceRippleProps {
  volume: number; // 0-100
  isActive: boolean;
}

const VoiceRipple: React.FC<VoiceRippleProps> = ({ volume, isActive }) => {
  const { t } = useLanguage();
  const [displayVolume, setDisplayVolume] = useState(0);
  const animationFrameRef = useRef<number>(null);

  useEffect(() => {
    if (!isActive) {
      setDisplayVolume(0);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const updateVolume = () => {
      setDisplayVolume((prev) => {
        // 目标音量：如果没有输入，保持一个 15% 的“呼吸”底噪，模拟系统在倾听
        const target = volume > 0 ? volume : 15;
        
        // 阻尼系数 (Damping Factor)
        // 扩张时快一些 (0.15)，收缩时慢一些 (0.05) 以实现 1-2秒的优雅收缩
        const factor = target > prev ? 0.15 : 0.05;
        
        // 线性插值算法 (Lerp)
        const next = prev + (target - prev) * factor;
        
        // 如果差异极小则停止波动，防止微小跳跃
        return Math.abs(next - prev) < 0.1 ? target : next;
      });
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    animationFrameRef.current = requestAnimationFrame(updateVolume);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [volume, isActive]);

  if (!isActive) return null;

  // 基础缩放 1.0，最大 2.2，相比之前更克制
  const scale = 1 + (displayVolume / 100) * 1.2;
  const opacity = 0.2 + (displayVolume / 100) * 0.4;

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-[100] flex items-center justify-center">
      {/* 外层大波纹：柔和、毛玻璃效果 */}
      <div 
        className="absolute w-32 h-32 bg-blue-400/20 rounded-full backdrop-blur-md transition-transform duration-500 ease-out"
        style={{ transform: `scale(${scale * 1.3})`, opacity: opacity * 0.3 }}
      />
      
      {/* 中层波纹：缓慢呼吸感 */}
      <div 
        className="absolute w-28 h-28 bg-blue-500/30 rounded-full backdrop-blur-sm transition-transform duration-700 ease-out"
        style={{ transform: `scale(${scale})`, opacity: opacity * 0.5 }}
      />
      
      {/* 核心图标：稳定的锚点 */}
      <div className="relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] border-2 border-white/50">
        <span className="text-2xl drop-shadow-sm">🎙️</span>
        
        {/* 呼吸灯光晕 */}
        <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
      </div>
      
      {/* 文字提示：柔和半透明 */}
      <div className="absolute -top-14 whitespace-nowrap bg-black/50 text-white/90 text-sm px-4 py-1.5 rounded-full backdrop-blur-xl font-bold border border-white/10 shadow-lg tracking-wide">
        {t('ripple_listening')}
      </div>
    </div>
  );
};

export default VoiceRipple;
    