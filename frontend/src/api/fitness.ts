// Typed wrappers for every backend endpoint. Paths have no trailing slash
// (the backend would 307-redirect them).

import { request } from './client';
import type {
  Adaptation,
  Exercise,
  ExerciseState,
  Health,
  LogCreate,
  LogHistory,
  Recommendation,
} from '../types/api';

export function getHealth(): Promise<Health> {
  return request<Health>('/health');
}

export function getExercises(): Promise<Exercise[]> {
  return request<Exercise[]>('/exercises');
}

export function getStateSummary(): Promise<ExerciseState[]> {
  return request<ExerciseState[]>('/state/summary');
}

export function getExerciseState(exerciseId: number): Promise<ExerciseState> {
  return request<ExerciseState>(`/state/${exerciseId}`);
}

/** Logs come back oldest → newest; `limit` is 1..200 on the backend. */
export function getExerciseLogs(exerciseId: number, limit = 20): Promise<LogHistory> {
  return request<LogHistory>(`/logs/${exerciseId}?limit=${limit}`);
}

export function getAdaptations(exerciseId: number): Promise<Adaptation[]> {
  return request<Adaptation[]>(`/adaptations/${exerciseId}`);
}

/** Log a session. The backend runs the adaptive engine and returns the fresh recommendation. */
export function submitWorkoutLog(body: LogCreate): Promise<Recommendation> {
  const payload: LogCreate = {
    exerciseId: body.exerciseId,
    plannedWeight: body.plannedWeight,
    plannedReps: body.plannedReps,
    plannedSets: body.plannedSets,
    actualWeight: body.actualWeight,
    actualReps: body.actualReps,
    actualSets: body.actualSets,
    rpe: Math.round(body.rpe),
  };
  if (body.loggedAt) payload.loggedAt = body.loggedAt;
  return request<Recommendation>('/logs', { method: 'POST', body: payload });
}
