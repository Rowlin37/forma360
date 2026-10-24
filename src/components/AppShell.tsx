'use client';

import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  Dumbbell,
  Footprints,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Scale,
  Settings,
  Sun,
  Target,
  Utensils,
  X,
} from 'lucide-react';
import { useForma360 } from '@/context/Forma360Context';
import { formatEsDate, todayIsoInTimezone } from '@/lib/format';
import { NavSectionId } from '@/lib/types';

interface NavItemConfig {
  id: NavSectionId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Inicio / Dashboard', shortLabel: 'Inicio', icon: LayoutDashboard },
  { id: 'plan', label: 'Mi plan', shortLabel: 'Mi plan', icon: CalendarDays },
  { id: 'workouts', label: 'Entrenamientos', shortLabel: 'Entrenar', icon: Dumbbell },
  { id: 'running', label: 'Carrera y media maratón', shortLabel: 'Carrera 21K', icon: Footprints },
  { id: 'nutrition', label: 'Nutrición', shortLabel: 'Nutrición', icon: Utensils },
  { id: 'body', label: 'Seguimiento corporal', shortLabel: 'Cuerpo', icon: Scale },
  { id: 'exercises', label: 'Ejercicios y material', shortLabel: 'Ejercicios', icon: BookOpen },
  { id: 'stats', label: 'Historial y estadísticas', shortLabel: 'Estadísticas', icon: BarChart3 },
  { id: 'goals', label: 'Objetivos y retos', shortLabel: 'Objetivos', icon: Target },
  { id: 'profile', label: 'Mi perfil y configuración', shortLabel: 'Perfil', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    state,
    activeSection,
    setActiveSection,
    setThemeMode,
    logout,
    toasts,
    dismissToast,
  } = useForma360();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  if (!state || !user) return null;

  const todayIso = todayIsoInTimezone(state.profile.timezone);
  const pendingRecs = state.recommendations.filter((r) => r.status === 'pending').length;

  const cycleTheme = () => {
    const next = state.preferences.theme === 'dark' ? 'light' : 'dark';
    void setThemeMode(next);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#090d16]">
      {/* BARRA LATERAL ESCRITORIO */}
      <aside
        aria-label="Navegación principal"
        className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0d1321] sticky top-0 h-screen"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className="flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white">
                Forma360
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {formatEsDate(todayIso, true)} · {state.profile.timezone.split('/')[1] ?? 'Madrid'}
              </div>
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const showRecBadge = item.id === 'goals' && pendingRecs > 0;
            const showVerifyBadge =
              item.id === 'profile' &&
              (!state.profile.heightConfirmed || !state.profile.onboardingCompleted);

            return (
              <button
                key={item.id}
                type="button"
                data-nav-id={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {showRecBadge && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500 text-slate-950">
                    {pendingRecs}
                  </span>
                )}
                {showVerifyBadge && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Revisión inicial pendiente" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                {state.profile.displayName}
              </p>
              <p className="text-[11px] truncate text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleTheme}
                aria-label="Cambiar tema claro u oscuro"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {state.preferences.theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-300"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* CABECERA SUPERIOR MÓVIL */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1321]/95 backdrop-blur">
        <button
          type="button"
          onClick={() => setActiveSection('dashboard')}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="text-left">
            <span className="font-bold text-base text-slate-900 dark:text-white block leading-none">
              Forma360
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.shortLabel}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cycleTheme}
            aria-label="Cambiar tema"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            {state.preferences.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen((v) => !v)}
            aria-label="Abrir todas las secciones"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* CAJÓN NAVEGACIÓN COMPLETA MÓVIL */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs pt-16">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-1 max-h-[82vh] overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full min-h-12 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>

      {/* BARRA INFERIOR MÓVIL DE USO CON UNA MANO */}
      <nav
        aria-label="Acciones rápidas móviles"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1321]/95 backdrop-blur px-1 py-1.5"
      >
        {(
          [
            NAV_ITEMS[0]!, // Inicio
            NAV_ITEMS[1]!, // Plan
            NAV_ITEMS[2]!, // Entrenamientos
            NAV_ITEMS[4]!, // Nutrición
            NAV_ITEMS[5]!, // Cuerpo
          ] as NavItemConfig[]
        ).map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`min-h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-full px-1">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* NOTIFICACIONES FLOTANTES ACCESIBLES */}
      <div
        aria-live="polite"
        className="fixed bottom-20 lg:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className={`pointer-events-auto cursor-pointer rounded-xl border px-4 py-3 text-xs font-medium shadow-lg transition ${
              toast.tone === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700'
                : toast.tone === 'warning'
                  ? 'bg-amber-950 text-amber-100 border-amber-700'
                  : 'bg-slate-900 text-slate-100 border-emerald-500/40'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
