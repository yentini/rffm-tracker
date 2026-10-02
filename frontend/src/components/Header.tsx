import React from 'react';
import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isLoading }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 safe-top-padding">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="font-black text-white text-xs tracking-wider">RF</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-white tracking-tight">RFEF Tracker</h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Seguimiento en directo</p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Actualizar datos"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
        </button>
      </div>
    </header>
  );
};
