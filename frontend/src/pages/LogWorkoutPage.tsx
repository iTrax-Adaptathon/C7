import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, Sparkles, Target, X } from 'lucide-react';
import { ApiError, submitWorkoutLog } from '../api';
import { ErrorState } from '../components/ErrorState';
import { PreWorkoutCheckInCard } from '../components/PreWorkoutCheckInCard';
import { RpeSelector } from '../components/RpeSelector';
import { Stepper } from '../components/Stepper';
import type { Prescription, Recommendation, SetAutoregulationOut } from '../types/api';
import { evaluateSetOvershootClient } from '../utils/autoregulation';
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
  const [autoregAlert, setAutoregAlert] = useState<SetAutoregulationOut | null>(null);
  const [showReadinessCheckIn, setShowReadinessCheckIn] = useState(true);
  // The plan actually trained under. Starts as the backend's prescription;
  // a readiness check-in can lower or raise it for *this* session only, so
  // the log compares performance against the day's real target instead of
  // unfairly scoring a rationally-reduced day as a missed lift.
  const [effectivePlanned, setEffectivePlanned] = useState<Prescription>(start);

  const targetRpe = 7.0; // standard baseline target effort


  const canSubmit = rpe != null && !submitting && weight > 0 && reps >= 1 && sets >= 1;

  const submit = async () => {
    if (rpe == null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const recommendation = await submitWorkoutLog({
        exerciseId,
        plannedWeight: effectivePlanned.weight,
        plannedReps: effectivePlanned.reps,
        plannedSets: effectivePlanned.sets,
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

  const handleRpeChange = (newRpe: number) => {
    setRpe(newRpe);
    const evalResult = evaluateSetOvershootClient(1, targetRpe, newRpe, weight, reps, WEIGHT_STEP, MIN_WEIGHT);
    if (evalResult.triggered) {
      setAutoregAlert(evalResult);
    } else {
      setAutoregAlert(null);
    }
  };

  const applyAutoreg = () => {
    if (!autoregAlert) return;
    setWeight(autoregAlert.recommendedWeight);
    setAutoregAlert(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-8" id="view-log-workout">
      <div className="flex items-center justify-between pt-1">
        <button
          id="btn-cancel-log"
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1D2520] hover:bg-[#20352A] active:scale-95 disabled:opacity-40 text-[#F1EDE3] font-medium text-sm transition-all border border-[#303832] cursor-pointer"
        >
          <X size={16} />
          Cancel
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8B8AD] font-mono">Log session</span>
      </div>

      <h1 className="text-2xl font-black text-[#F1EDE3] tracking-tight leading-tight">{exerciseName}</h1>

      {/* Planned reference */}
      <div className="rounded-2xl bg-[#171C19] border border-[#303832] p-4 flex items-center gap-3 shadow-sm">
        <Target size={22} className="text-[#8FB69A] shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8FB69A] font-mono">
            {planned ? 'Target Prescription' : 'Introductory Session'}
          </div>
          {planned ? (
            <div className="font-mono text-lg font-black text-[#F1EDE3]">
              {formatPrescription(effectivePlanned)}
              {effectivePlanned.weight !== planned.weight && (
                <span className="ml-2 align-middle text-[10px] font-mono font-bold uppercase tracking-wide text-[#8FB69A]">
                  readiness-adjusted from {planned.weight} kg
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm text-[#B8B8AD]">Enter what you completed — this initializes the adaptive baseline.</div>
          )}
        </div>
      </div>

      {/* Sprint 2: Pre-Workout Readiness Check-in Card */}
      {showReadinessCheckIn && (
        <PreWorkoutCheckInCard
          exerciseId={exerciseId}
          initialPlan={planned}
          onApplyAdjustment={(adjWeight) => {
            setWeight(adjWeight);
            setEffectivePlanned((prev) => ({ ...prev, weight: adjWeight }));
            setShowReadinessCheckIn(false);
          }}
        />
      )}

      {/* Intra-Session Set Autoregulation Notification Banner */}
      {autoregAlert && autoregAlert.triggered && (
        <div
          className={`rounded-2xl border p-4 shadow-sm flex flex-col gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
            autoregAlert.adjustmentType === 'LOAD_DROP'
              ? 'bg-[#C86B68]/15 border-[#C86B68]/30 text-[#F1EDE3]'
              : 'bg-[#8FB69A]/15 border-[#8FB69A]/30 text-[#F1EDE3]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {autoregAlert.adjustmentType === 'LOAD_DROP' ? (
                <AlertTriangle size={18} className="text-[#C86B68] shrink-0 stroke-[2.5]" />
              ) : (
                <Sparkles size={18} className="text-[#8FB69A] shrink-0 stroke-[2.5]" />
              )}
              <span
                className={`text-xs font-mono font-bold uppercase tracking-wide ${
                  autoregAlert.adjustmentType === 'LOAD_DROP' ? 'text-[#C86B68]' : 'text-[#8FB69A]'
                }`}
              >
                {autoregAlert.adjustmentType === 'LOAD_DROP'
                  ? 'Fatigue Stop Triggered'
                  : 'Autoregulated Supercompensation'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoregAlert(null)}
              className="text-[#B8B8AD] hover:text-[#F1EDE3] p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs leading-relaxed text-[#F1EDE3]">{autoregAlert.message}</p>

          <button
            type="button"
            onClick={applyAutoreg}
            className="h-9 px-3.5 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all bg-[#8FB69A] hover:bg-[#A8D1B1] text-[#111312] shadow-sm cursor-pointer"
          >
            Apply {autoregAlert.recommendedWeight} kg ({autoregAlert.deltaWeight > 0 ? `+${autoregAlert.deltaWeight}` : autoregAlert.deltaWeight} kg)
            <ChevronRight size={14} />
          </button>
        </div>
      )}

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
          onChange={(w) => {
            setWeight(w);
            if (rpe != null) {
              const res = evaluateSetOvershootClient(1, targetRpe, rpe, w, reps, WEIGHT_STEP, MIN_WEIGHT);
              setAutoregAlert(res.triggered ? res : null);
            }
          }}
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
          onChange={(r) => {
            setReps(r);
            if (rpe != null) {
              const res = evaluateSetOvershootClient(1, targetRpe, rpe, weight, r, WEIGHT_STEP, MIN_WEIGHT);
              setAutoregAlert(res.triggered ? res : null);
            }
          }}
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
        <RpeSelector value={rpe} onChange={handleRpeChange} />
      </div>

      {error && <ErrorState error={error} compact />}

      <button
        id="btn-submit-workout-log"
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full h-14 rounded-xl bg-[#8FB69A] hover:bg-[#A8D1B1] active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed text-[#111312] font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Analyzing your recent sessions…
          </>
        ) : (
          <>
            <CheckCircle2 size={20} className="stroke-[2.5]" />
            {error ? 'Retry — Log workout' : 'Log workout'}
          </>
        )}
      </button>
      {rpe == null && !submitting && (
        <p className="text-center text-xs text-[#B8B8AD] -mt-2">Pick an RPE to enable logging.</p>
      )}
    </div>
  );
}
