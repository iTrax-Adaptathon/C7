import { useState } from 'react';
import { CheckCircle2, Loader2, Target, X } from 'lucide-react';
import { ApiError, submitWorkoutLog } from '../api';
import { ErrorState } from '../components/ErrorState';
import { RpeSelector } from '../components/RpeSelector';
import { Stepper } from '../components/Stepper';
import type { Prescription, Recommendation } from '../types/api';
import { formatPrescription } from '../utils/format';

interface LogWorkoutPageProps {
  exerciseId: number;
  exerciseName: string;
  /** The backend's current recommendation, or null for an exercise with no sessions yet. */
  planned: Prescription | null;
  onCancel: () => void;
  onLogged: (recommendation: Recommendation) => void;
}

/** Backend progression step; the steppers move in the same increments the engine prescribes. */
const WEIGHT_STEP = 2.5;
const MIN_WEIGHT = 2.5;
const FIRST_SESSION_DEFAULT: Prescription = { weight: 20, reps: 8, sets: 3 };

/**
 * The logging screen. Planned values are pre-filled from the backend
 * recommendation; the user adjusts what they actually did, picks an RPE and
 * taps LOG WORKOUT. The backend does all the analysis.
 */
export function LogWorkoutPage({ exerciseId, exerciseName, planned, onCancel, onLogged }: LogWorkoutPageProps) {
  const start = planned ?? FIRST_SESSION_DEFAULT;
  const [weight, setWeight] = useState(start.weight);
  const [reps, setReps] = useState(start.reps);
  const [sets, setSets] = useState(start.sets);
  const [rpe, setRpe] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const canSubmit = rpe != null && !submitting && weight > 0 && reps >= 1 && sets >= 1;

  const submit = async () => {
    if (rpe == null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const recommendation = await submitWorkoutLog({
        exerciseId,
        plannedWeight: planned?.weight ?? weight,
        plannedReps: planned?.reps ?? reps,
        plannedSets: planned?.sets ?? sets,
        actualWeight: weight,
        actualReps: reps,
        actualSets: sets,
        rpe,
      });
      onLogged(recommendation);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Something went wrong while logging.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-8" id="view-log-workout">
      <div className="flex items-center justify-between pt-1">
        <button
          id="btn-logger-cancel"
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex items-center gap-2 h-11 px-4 rounded-xl bg-[#181d26] hover:bg-[#202734] active:scale-95 disabled:opacity-40 text-white font-semibold text-sm transition-all border border-slate-800"
        >
          <X size={16} />
          Cancel
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Log session</span>
      </div>

      <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{exerciseName}</h1>

      {/* Planned reference */}
      <div className="rounded-2xl bg-[#38bdf8]/10 border border-[#38bdf8]/30 p-4 flex items-center gap-3">
        <Target size={22} className="text-[#38bdf8] shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] font-mono">
            {planned ? 'Planned (your recommendation)' : 'First session'}
          </div>
          {planned ? (
            <div className="font-mono text-lg font-black text-white">{formatPrescription(planned)}</div>
          ) : (
            <div className="text-sm text-slate-300">Enter what you did — this becomes the plan for the next recommendation.</div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Stepper
          id="actual-weight"
          label="Actual weight"
          hint={`steps of ${WEIGHT_STEP} kg`}
          value={weight}
          step={WEIGHT_STEP}
          min={MIN_WEIGHT}
          unit="kg"
          decimals={2}
          planned={planned?.weight}
          onChange={setWeight}
        />
        <Stepper
          id="actual-reps"
          label="Actual reps"
          hint="per set"
          value={reps}
          step={1}
          min={1}
          unit="reps"
          planned={planned?.reps}
          onChange={setReps}
        />
        <Stepper
          id="actual-sets"
          label="Actual sets"
          hint="completed"
          value={sets}
          step={1}
          min={1}
          unit="sets"
          planned={planned?.sets}
          onChange={setSets}
        />
        <RpeSelector value={rpe} onChange={setRpe} />
      </div>

      {error && <ErrorState error={error} compact />}

      <button
        id="btn-submit-workout-log"
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full h-16 rounded-full bg-[#4edea3] hover:bg-[#3ec48e] active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 text-[#003824] font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#4edea3]/20 transition-all"
      >
        {submitting ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            Analyzing your recent sessions…
          </>
        ) : (
          <>
            <CheckCircle2 size={22} className="stroke-[2.5]" />
            {error ? 'Retry — Log workout' : 'Log workout'}
          </>
        )}
      </button>
      {rpe == null && !submitting && (
        <p className="text-center text-xs text-slate-500 -mt-2">Pick an RPE to enable logging.</p>
      )}
    </div>
  );
}
