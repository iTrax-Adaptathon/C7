import { getExerciseLogs, getExercises } from '../api';
import type { Exercise, HistoryEntry } from '../types/api';
import { useAsync } from './useAsync';

export interface AllLogsData {
  exercises: Exercise[];
  /** Newest first across all exercises. */
  entries: HistoryEntry[];
}

const PER_EXERCISE_LIMIT = 50;

async function loadAllLogs(): Promise<AllLogsData> {
  const exercises = await getExercises();
  const histories = await Promise.all(exercises.map((e) => getExerciseLogs(e.id, PER_EXERCISE_LIMIT)));
  const entries: HistoryEntry[] = histories.flatMap((h) =>
    h.logs.map((log) => ({ ...log, exerciseId: h.exerciseId, exerciseName: h.exerciseName })),
  );
  entries.sort((a, b) => (a.loggedAt === b.loggedAt ? b.id - a.id : a.loggedAt < b.loggedAt ? 1 : -1));
  return { exercises, entries };
}

export function useAllLogs(refreshKey = 0) {
  return useAsync(loadAllLogs, [refreshKey]);
}
