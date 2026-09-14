import { getExercises, getStateSummary } from '../api';
import type { Exercise, ExerciseState } from '../types/api';
import { useAsync } from './useAsync';

export interface DashboardData {
  /** Exercises that have at least one logged session, with their next prescription. */
  states: ExerciseState[];
  /** Exercises present in the database but without any session yet. */
  unstarted: Exercise[];
}

async function loadDashboard(): Promise<DashboardData> {
  const [states, exercises] = await Promise.all([getStateSummary(), getExercises()]);
  const withState = new Set(states.map((s) => s.exerciseId));
  return {
    states,
    unstarted: exercises.filter((e) => !withState.has(e.id)),
  };
}

export function useStateSummary(refreshKey = 0) {
  return useAsync(loadDashboard, [refreshKey]);
}
