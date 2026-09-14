import type { SetAutoregulationOut } from '../types/api';

/**
 * Pure client-side evaluation of set RPE overshoot or undershoot for 0ms latency in the logger.
 * Matches backend evaluate_set_overshoot logic exactly.
 */
export function evaluateSetOvershootClient(
  setIndex: number,
  targetRpe: number,
  actualRpe: number,
  currentWeight: number,
  currentReps: number,
  weightStep = 2.5,
  minWeight = 2.5,
): SetAutoregulationOut {
  const diff = Number((actualRpe - targetRpe).toFixed(1));

  // Overshoot condition: +2.0 RPE above target -> 5% load drop
  if (actualRpe >= targetRpe + 2.0) {
    const rawNewWeight = currentWeight * 0.95;
    let newWeight = Math.max(Math.round(rawNewWeight / weightStep) * weightStep, minWeight);
    if (newWeight === currentWeight && currentWeight - weightStep >= minWeight) {
      newWeight = currentWeight - weightStep;
    }
    newWeight = Number(newWeight.toFixed(2));
    const deltaW = Number((newWeight - currentWeight).toFixed(2));
    const deltaPct = currentWeight > 0 ? Number(((newWeight - currentWeight) / currentWeight * 100).toFixed(1)) : 0;

    return {
      triggered: true,
      adjustmentType: 'LOAD_DROP',
      recommendedWeight: newWeight,
      recommendedReps: currentReps,
      deltaWeight: deltaW,
      deltaReps: 0,
      deltaPct,
      message: `Fatigue Stop: Set ${setIndex} RPE was ${actualRpe} (+${diff} above target ${targetRpe}). Recommended 5% load drop (${newWeight} kg, ${deltaW} kg) on remaining sets to avoid premature failure.`,
      targetRpe,
      actualRpe,
      setIndex,
    };
  }

  // Undershoot condition on Set 1: -2.5 RPE below target -> +2.5% progression jump
  if (setIndex === 1 && actualRpe <= targetRpe - 2.5) {
    const rawNewWeight = currentWeight * 1.025;
    let newWeight = Math.max(Math.round(rawNewWeight / weightStep) * weightStep, currentWeight + weightStep);
    newWeight = Number(newWeight.toFixed(2));
    const deltaW = Number((newWeight - currentWeight).toFixed(2));
    const deltaPct = currentWeight > 0 ? Number(((newWeight - currentWeight) / currentWeight * 100).toFixed(1)) : 0;

    return {
      triggered: true,
      adjustmentType: 'LOAD_INCREASE',
      recommendedWeight: newWeight,
      recommendedReps: currentReps,
      deltaWeight: deltaW,
      deltaReps: 0,
      deltaPct,
      message: `Athlete Primed: Set 1 RPE was ${actualRpe} (-${Math.abs(diff)} below target ${targetRpe}). Optional +2.5% progression jump (${newWeight} kg, +${deltaW} kg) recommended for remaining sets.`,
      targetRpe,
      actualRpe,
      setIndex,
    };
  }

  return {
    triggered: false,
    adjustmentType: 'NONE',
    recommendedWeight: currentWeight,
    recommendedReps: currentReps,
    deltaWeight: 0,
    deltaReps: 0,
    deltaPct: 0,
    message: `Set ${setIndex} completed within expected effort (RPE ${actualRpe} vs target ${targetRpe}).`,
    targetRpe,
    actualRpe,
    setIndex,
  };
}
