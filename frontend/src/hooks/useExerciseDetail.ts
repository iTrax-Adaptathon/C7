import { ApiError, getAdaptations, getExerciseLogs, getExerciseState } from '../api';
import type { Adaptation, ExerciseState, WorkoutLog } from '../types/api';
import { useAsync } from './useAsync';

export interface ExerciseDetailData {
  exerciseName: string;
  /** null when the exercise has no logged sessions yet (backend returns 404). */
  state: ExerciseState | null;
  /** Oldest → newest, as returned by the backend. */
  logs: WorkoutLog[];
  /** Newest first, as returned by the backend. */
  adaptations: Adaptation[];
}

async function loadDetail(exerciseId: number): Promise<ExerciseDetailData> {
  const [state, history, adaptations] = await Promise.all([
    getExerciseState(exerciseId).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404 && err.detail.includes('log a workout')) return null;
      throw err;
    }),
    getExerciseLogs(exerciseId, 20),
    getAdaptations(exerciseId),
  ]);
  return { exerciseName: history.exerciseName, state, logs: history.logs, adaptations };
}

export function useExerciseDetail(exerciseId: number, refreshKey = 0) {
  return useAsync(() => loadDetail(exerciseId), [exerciseId, refreshKey]);
}
