// TypeScript mirrors of backend/schemas.py. The backend is strictly camelCase
// in both directions; keep these in sync with the Pydantic models.

export type Decision = 'PROGRESS' | 'HOLD' | 'BACK OFF';
export type TrendDirection = 'IMPROVING' | 'STABLE' | 'DECLINING';

export interface Prescription {
  weight: number;
  reps: number;
  sets: number;
}

export interface Health {
  status: string;
}

export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
}

/** POST /logs request body. `loggedAt` is a naive ISO 8601 UTC string, no "Z". */
export interface LogCreate {
  exerciseId: number;
  plannedWeight: number;
  plannedReps: number;
  plannedSets: number;
  actualWeight: number;
  actualReps: number;
  actualSets: number;
  rpe: number;
  loggedAt?: string;
}

export interface WorkoutLog {
  id: number;
  /** Naive ISO 8601 UTC, e.g. "2026-09-14T15:20:59" (no timezone suffix). */
  loggedAt: string;
  plannedWeight: number;
  plannedReps: number;
  plannedSets: number;
  actualWeight: number;
  actualReps: number;
  actualSets: number;
  rpe: number;
  volume: number;
  sessionScore: number;
}

/** GET /logs/{exerciseId} — logs are ordered oldest → newest. */
export interface LogHistory {
  exerciseId: number;
  exerciseName: string;
  logs: WorkoutLog[];
}

export interface Reasoning {
  sessionCount: number;
  sessionScore: number;
  recentScore: number;
  weightedScore: number;
  performanceTrend: number;
  rpeTrend: number;
  volumeTrend: number;
  consistency: number;
  signalStrength: number;
}

/** POST /logs response (201). `previous` is the log's planned prescription. */
export interface Recommendation {
  exerciseId: number;
  logId: number;
  decision: Decision;
  previous: Prescription;
  next: Prescription;
  confidence: number;
  trendDirection: TrendDirection;
  reasoning: Reasoning;
  explanation: string;
}

/** GET /state/summary item and GET /state/{exerciseId}. `current` is the NEXT prescription. */
export interface ExerciseState {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  decision: Decision;
  confidence: number;
  trendDirection: TrendDirection;
  current: Prescription;
  explanation: string;
  updatedAt: string;
}

/** GET /adaptations/{exerciseId} — ordered newest first. */
export interface Adaptation {
  id: number;
  workoutLogId: number;
  exerciseId: number;
  loggedAt: string;
  decision: Decision;
  confidence: number;
  previous: Prescription;
  next: Prescription;
  explanation: string;
}

/** UI-only: a log merged with its exercise for the cross-exercise history view. */
export type HistoryEntry = WorkoutLog & { exerciseId: number; exerciseName: string };
