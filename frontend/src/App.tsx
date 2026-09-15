import { useState } from 'react';
import { AdaptationResultModal } from './components/AdaptationResultModal';
import { BottomNav, type Tab } from './components/BottomNav';
import { DeviceFrame } from './components/DeviceFrame';
import { MobileStatusBar } from './components/MobileStatusBar';
import { TopHeader } from './components/TopHeader';
import { DeviceModeContext } from './context/DeviceModeContext';
import { useStandalone } from './hooks/useStandalone';
import { useStateSummary } from './hooks/useStateSummary';
import { DashboardPage } from './pages/DashboardPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { JudgeDemo } from './pages/JudgeDemo';
import { LogWorkoutPage } from './pages/LogWorkoutPage';
import type { Prescription, Recommendation } from './types/api';

type View =
  | { name: 'dashboard' }
  | { name: 'history' }
  | { name: 'playground' }
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
  const [deviceMode, setDeviceMode] = useState<'phone' | 'laptop'>('phone');
  // Bumped after every successful log so detail/history pages re-fetch.
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<LoggedResult | null>(null);
  const summary = useStateSummary(refreshKey);
  const standalone = useStandalone();

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

  const activeTab: Tab | null =
    view.name === 'dashboard'
      ? 'dashboard'
      : view.name === 'history'
      ? 'history'
      : view.name === 'playground'
      ? 'playground'
      : null;

  return (
    <DeviceModeContext.Provider value={deviceMode}>
      <DeviceFrame deviceMode={deviceMode} onToggleDevice={setDeviceMode}>
      {/* Mobile Status Bar only rendered in Phone mode */}
      {deviceMode === 'phone' && !standalone && <MobileStatusBar isMobileFrame={true} />}

      {/* Top App Header with Live Backend Dot and Device Switcher */}
      <TopHeader deviceMode={deviceMode} onToggleDevice={setDeviceMode} />

      {/* Main App Content Viewport */}
      <main
        id="main-screen-container"
        className="flex-1 overflow-y-auto px-4 sm:px-6 pb-24 pt-2 no-scrollbar relative overscroll-contain"
      >
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
        {view.name === 'playground' && <JudgeDemo />}
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

      {/* Docked Bottom Navigation Bar */}
      {activeTab && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'dashboard') setView({ name: 'dashboard' });
            else if (tab === 'history') setView({ name: 'history' });
            else if (tab === 'playground') setView({ name: 'playground' });
          }}
        />
      )}

      {/* Adaptation Result Modal */}
      {result && (
        <AdaptationResultModal exerciseName={result.exerciseName} recommendation={result.recommendation} onDismiss={dismissResult} />
      )}
    </DeviceFrame>
    </DeviceModeContext.Provider>
  );
}

