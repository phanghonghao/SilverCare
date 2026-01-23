
import React from 'react';
import { AppRoute } from '../types';

interface NavigationProps {
  currentRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentRoute, setRoute }) => {
  const navItems = [
    { route: AppRoute.HOME, label: '首页', icon: '🏠' },
    { route: AppRoute.CHAT, label: '聊天', icon: '💬' },
    { route: AppRoute.SAFETY, label: '安全', icon: '🛡️' },
    { route: AppRoute.GUARDIAN, label: '守卫', icon: '👁️' },
    { route: AppRoute.REMINDERS, label: '提醒', icon: '⏰' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 flex justify-around items-center h-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
      {navItems.map((item) => (
        <button
          key={item.route}
          onClick={() => setRoute(item.route)}
          className={`flex flex-col items-center justify-center w-full h-full active-scale ${
            currentRoute === item.route ? 'text-blue-600' : 'text-slate-400'
          }`}
        >
          <span className="text-2xl mb-1">{item.icon}</span>
          <span className="text-[10px] font-medium leading-none">{item.label}</span>
          {currentRoute === item.route && (
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1"></div>
          )}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
