'use client';

import React from 'react';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { BodyTrackingSection } from '@/components/sections/BodyTrackingSection';
import { DashboardSection } from '@/components/sections/DashboardSection';
import { ExercisesSection } from '@/components/sections/ExercisesSection';
import { GoalsSection } from '@/components/sections/GoalsSection';
import { NutritionSection } from '@/components/sections/NutritionSection';
import { PlanSection } from '@/components/sections/PlanSection';
import { ProfileSection } from '@/components/sections/ProfileSection';
import { RunningSection } from '@/components/sections/RunningSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { WorkoutsSection } from '@/components/sections/WorkoutsSection';
import { useForma360 } from '@/context/Forma360Context';

export default function HomePage() {
  const { user, state, loading, activeSection } = useForma360();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Cargando tu espacio Forma360...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !state) {
    return <AuthGate />;
  }

  return (
    <AppShell>
      {activeSection === 'dashboard' && <DashboardSection />}
      {activeSection === 'plan' && <PlanSection />}
      {activeSection === 'workouts' && <WorkoutsSection />}
      {activeSection === 'running' && <RunningSection />}
      {activeSection === 'nutrition' && <NutritionSection />}
      {activeSection === 'body' && <BodyTrackingSection />}
      {activeSection === 'exercises' && <ExercisesSection />}
      {activeSection === 'stats' && <StatsSection />}
      {activeSection === 'goals' && <GoalsSection />}
      {activeSection === 'profile' && <ProfileSection />}
    </AppShell>
  );
}
