import React, { useState } from 'react';
import { Cloud, LogIn, LogOut, RefreshCw, User } from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  user?: AuthUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isLoading,
  user,
  onOpenAuthModal,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 safe-top-padding">
      <div className="max-w-xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="font-black text-white text-[10px] tracking-wide">RFFM</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-white tracking-tight">RFFM Tracker</h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Fútbol de Madrid en directo</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-all"
                title={`Conectado como ${user.email}`}
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[96px] truncate">{displayName}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-3 z-50">
                  <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-red-600/20 hover:text-red-300 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Cerrar sesión
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-red-400" />
                <span>Invitado · Entrar</span>
              </button>
            )
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Actualizar datos"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
