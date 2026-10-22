'use client';

import React, { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import { authCredentialsSchema } from '@/lib/types';

export function AuthGate() {
  const { login, register, openDemoProfile, isSupabaseCloud } = useForma360();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const parsed = authCredentialsSchema.safeParse({
      email,
      password,
      displayName: mode === 'register' ? displayName || 'Atleta Forma360' : undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos introducidos.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        const res = await register(
          parsed.data.email,
          parsed.data.password,
          parsed.data.displayName
        );
        if (!res.ok) {
          setError(res.error ?? 'No se pudo completar el registro.');
        } else if (res.requiresEmailConfirmation) {
          setInfoMessage(
            'Cuenta registrada en Supabase. Revisa tu bandeja de entrada para confirmar el enlace antes de iniciar sesión.'
          );
        }
      } else {
        const res = await login(parsed.data.email, parsed.data.password);
        if (!res.ok) {
          setError(res.error ?? 'Correo o contraseña incorrectos.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 bg-slate-50 dark:bg-[#090d16]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Forma360
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Transformación física sostenible · Fuerza · Nutrición · Rumbo a Media Maratón
          </p>
        </div>

        {/* Estado honesto de persistencia */}
        <div
          className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
            isSupabaseCloud
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200'
          }`}
        >
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {isSupabaseCloud
              ? 'Persistencia en nube Supabase activa (RLS habilitado)'
              : 'Modo Local Persistente (Supabase pendiente de configurar)'}
          </div>
          {isSupabaseCloud
            ? 'Tus datos se guardan cifrados en tu base PostgreSQL de Supabase asociados únicamente a tu usuario.'
            : 'Las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY aún no están definidas. Las cuentas que registres aquí guardan datos reales en este navegador aislados por usuario con contraseña cifrada (SHA-256).'}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Iniciar sesión
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Nombre o alias
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej. Carlos (Objetivo 75 kg / 21K)"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.es"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Contraseña (mín. 6 caracteres)
              </label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition disabled:opacity-50"
            >
              {mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  {submitting ? 'Creando cuenta...' : 'Crear mi cuenta e inicializar perfil'}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {submitting ? 'Accediendo...' : 'Entrar a mi cuenta'}
                </>
              )}
            </button>
          </form>

          {!isSupabaseCloud && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={openDemoProfile}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition"
              >
                Abrir directamente Perfil Inicial Precargado (35 años · 90 kg · Fútbol Mié/Dom)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
