import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Lock,
  LogIn,
  Mail,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { AuthResponse } from '../types';
import { loginUser, loginWithGoogle, registerUser } from '../services/auth';

interface AuthScreenProps {
  onSuccess: (auth: AuthResponse) => void;
  onContinueAsGuest: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>
          ) => void;
        };
      };
    };
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  onContinueAsGuest,
  isModal = false,
  onCloseModal,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;

    const initGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) return;
          setErrorMsg(null);
          setIsSubmitting(true);
          try {
            const auth = await loginWithGoogle(response.credential);
            onSuccess(auth);
          } catch (err: any) {
            setErrorMsg(err.message || 'No se pudo iniciar sesión con Google.');
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 320,
        text: 'continue_with',
        shape: 'pill',
      });
    };

    if (window.google?.accounts?.id) {
      initGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleButton;
    document.head.appendChild(script);
  }, [googleClientId, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const auth =
        tab === 'register'
          ? await registerUser(email, password, name)
          : await loginUser(email, password);
      onSuccess(auth);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative">
      {isModal && onCloseModal && (
        <button
          onClick={onCloseModal}
          aria-label="Cerrar ventana de acceso"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Cabecera de marca */}
      <div className="flex flex-col items-center text-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/25 mb-3">
          <span className="font-black text-white text-sm tracking-wider">RFFM</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">RFFM Tracker</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Guarda tus equipos y sedes favoritas en tu cuenta para tenerlos siempre sincronizados en móvil y PC.
        </p>
      </div>

      {/* Selector de pestaña: Iniciar Sesión / Crear Cuenta Rápida */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            tab === 'login'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Iniciar Sesión
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('register');
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            tab === 'register'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Alta Rápida
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-center">
          {errorMsg}
        </div>
      )}

      {/* Formulario Email + Contraseña */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === 'register' && (
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Nombre o alias (opcional)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. César"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Contraseña {tab === 'register' && '(mín. 4 caracteres)'}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={tab === 'register' ? 4 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-semibold text-sm shadow-lg shadow-red-600/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Cloud className="w-4 h-4" />
          {isSubmitting
            ? 'Conectando...'
            : tab === 'register'
              ? 'Crear cuenta y sincronizar favoritos'
              : 'Entrar a mi cuenta'}
        </button>
      </form>

      {/* Botón Google OAuth (si está configurado VITE_GOOGLE_CLIENT_ID) */}
      {googleClientId && (
        <div className="mt-3 flex flex-col items-center">
          <div ref={googleBtnRef} className="flex justify-center" />
        </div>
      )}

      {/* Separador */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px bg-slate-800 flex-1" />
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
          o acceso directo
        </span>
        <div className="h-px bg-slate-800 flex-1" />
      </div>

      {/* Botón Modo Invitado */}
      <button
        type="button"
        onClick={onContinueAsGuest}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      >
        <UserCheck className="w-4 h-4 text-emerald-400" />
        Continuar como Invitado (sin registro)
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          Si creas cuenta después, tus favoritos de invitado se importan automáticamente.
        </span>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        {cardContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      {cardContent}
    </div>
  );
};

