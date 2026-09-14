import { useState } from 'react';
import { AdaptationResultModal } from './components/AdaptationResultModal';
import { BottomNav, type Tab } from './components/BottomNav';
import { TopHeader } from './components/TopHeader';
import { useStateSummary } from './hooks/useStateSummary';
import { DashboardPage } from './pages/DashboardPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { LogWorkoutPage } from './pages/LogWorkoutPage';
import type { Prescription, Recommendation } from './types/api';

type View =
  | { name: 'dashboard' }
  | { name: 'history' }
  | { name: 'detail'; exerciseId: number }
  | {
      name: 'log';
      exerciseId: number;
      exerciseName: string;
      planned: Prescription | null;
      returnTo: 'dashboard' | 'detail';
    };

interface LoggedResult {
  exerciseName: string;
  recommendation: Recommendation;
  returnTo: View;
}

export default function App() {
  const [view, setView] = useState<View>({ name: 'dashboard' });
  // Bumped after every successful log so detail/history pages re-fetch.
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<LoggedResult | null>(null);
  const summary = useStateSummary(refreshKey);

  const openLogger = (exerciseId: number, exerciseName: string, planned: Prescription | null, returnTo: 'dashboard' | 'detail') =>
    setView({ name: 'log', exerciseId, exerciseName, planned, returnTo });

  const handleLogged = (current: Extract<View, { name: 'log' }>, recommendation: Recommendation) => {
    setRefreshKey((k) => k + 1);
    setResult({
      exerciseName: current.exerciseName,
      recommendation,
      returnTo: current.returnTo === 'detail' ? { name: 'detail', exerciseId: current.exerciseId } : { name: 'dashboard' },
    });
  };

  const dismissResult = () => {
    if (result) setView(result.returnTo);
    setResult(null);
  };

  const activeTab: Tab | null = view.name === 'dashboard' ? 'dashboard' : view.name === 'history' ? 'history' : null;

  return (
    <div className="min-h-screen bg-[#070a0e] text-[#e0e2ea] flex items-center justify-center p-0 md:py-6 md:px-4">
      <div
        id="app-mobile-frame"
        className="w-full md:max-w-[430px] h-screen md:h-[910px] bg-[#101419] relative flex flex-col md:rounded-[44px] shadow-2xl shadow-black/80 md:border md:border-slate-800/80 overflow-hidden"
      >
        <TopHeader />

        <main id="main-screen-container" className="flex-1 overflow-y-auto px-4 sm:px-5 pb-24 pt-1 no-scrollbar relative">
          {view.name === 'dashboard' && (
            <DashboardPage
              summary={summary}
              onLog={(state) => openLogger(state.exerciseId, state.exerciseName, state.current, 'dashboard')}
              onLogFirst={(exercise) => openLogger(exercise.id, exercise.name, null, 'dashboard')}
              onDetails={(exerciseId) => setView({ name: 'detail', exerciseId })}
            />
          )}
          {view.name === 'history' && (
            <HistoryPage refreshKey={refreshKey} onOpenExercise={(exerciseId) => setView({ name: 'detail', exerciseId })} />
          )}
          {view.name === 'detail' && (
            <ExerciseDetailPage
              key={view.exerciseId}
              exerciseId={view.exerciseId}
              refreshKey={refreshKey}
              onBack={() => setView({ name: 'dashboard' })}
              onLog={(exerciseId, exerciseName, planned) => openLogger(exerciseId, exerciseName, planned, 'detail')}
            />
          )}
          {view.name === 'log' && (
            <LogWorkoutPage
              key={view.exerciseId}
              exerciseId={view.exerciseId}
              exerciseName={view.exerciseName}
              planned={view.planned}
              onCancel={() => setView(view.returnTo === 'detail' ? { name: 'detail', exerciseId: view.exerciseId } : { name: 'dashboard' })}
              onLogged={(recommendation) => handleLogged(view, recommendation)}
            />
          )}
        </main>

        {activeTab && <BottomNav activeTab={activeTab} onTabChange={(tab) => setView(tab === 'history' ? { name: 'history' } : { name: 'dashboard' })} />}

        {result && (
          <AdaptationResultModal exerciseName={result.exerciseName} recommendation={result.recommendation} onDismiss={dismissResult} />
        )}
      </div>
    </div>
  );
}
