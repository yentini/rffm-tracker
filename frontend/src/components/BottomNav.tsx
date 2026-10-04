import React from 'react';
import { Calendar, Trophy, Star, Shield, MapPin } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  favoritesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  favoritesCount = 0,
}) => {
  const tabs = [
    { id: 'partidos', label: 'Partidos', icon: Calendar },
    { id: 'clasificacion', label: 'Tablas', icon: Trophy },
    { id: 'sedes', label: 'Sedes', icon: MapPin },
    { id: 'favoritos', label: 'Favoritos', icon: Star, badge: favoritesCount > 0 ? favoritesCount : null },
    { id: 'clubes', label: 'Clubes', icon: Shield },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 safe-bottom-padding">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-16 py-1 transition-all active:scale-90 ${
                isActive ? 'text-red-500 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 mb-1 ${
                    isActive ? 'stroke-[2.5px] text-red-500' : 'stroke-2'
                  } ${tab.id === 'favoritos' && isActive ? 'fill-red-500/20' : ''}`}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full min-w-4 text-center shadow-md">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

