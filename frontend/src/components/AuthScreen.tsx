import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { AuthResponse } from '../types';
import { loginUser, registerUser } from '../services/auth';

interface AuthScreenProps {
  onSuccess: (auth: AuthResponse) => void;
  onContinueAsGuest: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passwordsMatch =
    tab === 'register' && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    tab === 'register' && confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (tab === 'register' && password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Verifica que ambas sean iguales.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth =
        tab === 'register'
          ? await registerUser(email, password)
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

      {/* Selector de pestaña: Iniciar Sesión / Alta Rápida */}
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

      {/* Formulario Email + Contraseña (con doble verificación en Alta Rápida y botón de mostrar/ocultar) */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1 leading-snug">
            Correo electrónico{' '}
            {tab === 'register' && (
              <span className="text-[10px] text-slate-500 font-normal">
                (No tiene por qué existir el correo electrónico, es únicamente para el alta en la aplicación)
              </span>
            )}
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
              type={showPassword ? 'text' : 'password'}
              required
              minLength={tab === 'register' ? 4 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {tab === 'register' && (
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Repetir contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-slate-950 border rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none ${
                  passwordsMismatch
                    ? 'border-red-500/70 focus:border-red-500'
                    : passwordsMatch
                      ? 'border-emerald-500/70 focus:border-emerald-500'
                      : 'border-slate-800 focus:border-red-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? 'Ocultar confirmación de contraseña'
                    : 'Ver confirmación de contraseña'
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordsMismatch && (
              <p className="text-[11px] text-red-400 mt-1">
                Las contraseñas no coinciden.
              </p>
            )}
            {passwordsMatch && (
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Las contraseñas coinciden.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || passwordsMismatch}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-semibold text-sm shadow-lg shadow-red-600/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Cloud className="w-4 h-4" />
          {isSubmitting
            ? 'Conectando...'
            : tab === 'register'
              ? 'Crear cuenta rápida'
              : 'Entrar a mi cuenta'}
        </button>
      </form>

      {/* Separador */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px bg-slate-800 flex-1" />
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
          o acceso sin cuenta
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
