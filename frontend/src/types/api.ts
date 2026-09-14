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

export interface ComponentBreakdown {
  perfTrend: number;
  scoreLevel: number;
  rpeSignal: number;
  volumeTrend: number;
}

export interface AthleteState {
  readinessPct: number;
  performanceStatus: string;
  fatigueLevel: string;
  recoveryStatus: string;
  adaptationStatus: string;
  confidencePct: number;
}

export interface PersonalBaseline {
  typicalRpe: number;
  typicalScore: number;
  typicalVolume: number;
  typicalReps: number;
  sessionsAnalyzed: number;
}

export interface CounterfactualOption {
  condition: string;
  resultingAction: string;
  explanation: string;
}

export interface SessionDelta {
  perfDeltaPct: number;
  rpeDelta: number;
  volumeDeltaPct: number;
  loadDelta: number;
  repsDelta: number;
  setsDelta: number;
}

export interface GlassBoxMetadata {
  action: Decision;
  recommendedLoad: number;
  recommendedReps: number;
  signalScore: number;
  confidence: number;
  componentBreakdown: ComponentBreakdown;
  triggeredRules: string[];
  coachingRationale: string;
  athleteState?: AthleteState;
  baseline?: PersonalBaseline;
  counterfactuals?: CounterfactualOption[];
  sessionDelta?: SessionDelta;
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
  // Sprint 2 Glass-box fields
  action?: Decision;
  recommendedLoad?: number;
  recommendedReps?: number;
  signalScore?: number;
  componentBreakdown?: ComponentBreakdown;
  triggeredRules?: string[];
  coachingRationale?: string;
  glassBox?: GlassBoxMetadata;
  // Athlete state, baseline, counterfactuals, delta
  athleteState?: AthleteState;
  baseline?: PersonalBaseline;
  counterfactuals?: CounterfactualOption[];
  sessionDelta?: SessionDelta;
}

export interface PreWorkoutCheckIn {
  sleepRating: number;
  sorenessRating: number;
  stressRating: number;
  targetLoad?: number;
  targetReps?: number;
  targetSets?: number;
}

export interface ReadinessOut {
  exerciseId?: number;
  sleepRating: number;
  sorenessRating: number;
  stressRating: number;
  readinessModifier: number;
  readinessScore: number;
  originalLoad: number;
  adjustedLoad: number;
  originalReps: number;
  adjustedReps: number;
  originalSets: number;
  adjustedSets: number;
  status: 'FRESH' | 'NORMAL' | 'FATIGUED';
  message: string;
}

export interface SetAutoregulationIn {
  setIndex: number;
  targetRpe: number;
  actualRpe: number;
  currentWeight: number;
  currentReps: number;
  weightStep?: number;
}

export interface SetAutoregulationOut {
  triggered: boolean;
  adjustmentType: 'LOAD_DROP' | 'LOAD_INCREASE' | 'NONE';
  recommendedWeight: number;
  recommendedReps: number;
  deltaWeight: number;
  deltaReps: number;
  deltaPct: number;
  message: string;
  targetRpe: number;
  actualRpe: number;
  setIndex: number;
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
  athleteState?: AthleteState;
  baseline?: PersonalBaseline;
  counterfactuals?: CounterfactualOption[];
  sessionDelta?: SessionDelta;
  componentBreakdown?: ComponentBreakdown;
  triggeredRules?: string[];
  coachingRationale?: string;
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
