"""Closed-loop simulation of the adaptive engine against model athletes.

The engine scores each session *relative to its plan*, and the plan changes
whenever the engine progresses or backs off. This script feeds the engine's
own prescription back in as the next session's plan, so the formulas are
validated in the loop they will actually run in - not only on fixed plans.

Usage (from the repo root)::

    python scripts/simulate.py --all            # run every scenario, print PASS/FAIL
    python scripts/simulate.py steady_adapter   # one scenario with a per-session table

The scenarios and acceptance criteria are mirrored by
``backend/tests/test_simulation.py``; both must pass before the defaults in
``backend/engine/config.py`` are considered final.
"""
from __future__ import annotations

import argparse
import math
import random
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.engine import evaluate  # noqa: E402
from backend.engine.config import DEFAULT_CONFIG, EngineConfig  # noqa: E402
from backend.engine.types import Decision, Prescription, SessionInput  # noqa: E402


# --------------------------------------------------------------------------
# Athlete model
# --------------------------------------------------------------------------

@dataclass
class Athlete:
    """A deterministic athlete described by a capacity: the weight they can lift
    for 10 clean reps. Reps achievable at other weights follow an exponential
    reps-at-%1RM curve (%1RM = REP_DECAY ** (reps - 1); ~79 % for 10 reps,
    ~69 % for 15, ~61 % for 20), which behaves sensibly at high reps where
    Epley does not. RPE is derived from reps in reserve.

    drift_pct: capacity change per session (+ adapting, 0 plateau, - fatigue).
    A novice on linear progression gains roughly 1 %/session.
    """

    capacity: float
    drift_pct: float = 0.0
    noise_reps: int = 0  # +/- reps of noise (seeded)
    noise_rpe: int = 0  # +/- RPE noise (seeded)
    seed: int = 0
    bad_days: set[int] = field(default_factory=set)  # 1-based session numbers
    stall_after_session: int | None = None  # stop adapting after this session number
    _rng: random.Random = field(init=False)

    def __post_init__(self) -> None:
        self._rng = random.Random(self.seed)

    REP_DECAY = 0.974

    def one_rm(self) -> float:
        return self.capacity / (self.REP_DECAY ** 9)

    def max_reps_at(self, weight: float) -> float:
        pct = weight / self.one_rm()
        if pct >= 1.0:
            return 1.0 if pct == 1.0 else 0.0
        return 1 + math.log(pct) / math.log(self.REP_DECAY)

    def perform(self, plan: Prescription, session_no: int) -> SessionInput:
        max_reps = self.max_reps_at(plan.weight)
        if session_no in self.bad_days:
            max_reps *= 0.6  # a rough day: noticeably weaker
        if self.noise_reps:
            max_reps += self._rng.randint(-self.noise_reps, self.noise_reps)
        # Fatigue across sets: the last set is the limiting one.
        per_set_capacity = math.floor(max_reps * (1 - 0.04 * (plan.sets - 1)))
        if per_set_capacity >= plan.reps:
            reps = plan.reps
            rir = per_set_capacity - plan.reps
            rpe = 10 - rir  # RIR 0 -> RPE 10, RIR 3 -> RPE 7
        else:
            reps = max(1, per_set_capacity)
            rpe = 10
        if self.noise_rpe:
            rpe += self._rng.randint(-self.noise_rpe, self.noise_rpe)
        rpe = int(max(1, min(10, rpe)))
        return SessionInput(
            planned_weight=plan.weight,
            planned_reps=plan.reps,
            planned_sets=plan.sets,
            actual_weight=plan.weight,
            actual_reps=reps,
            actual_sets=plan.sets,
            rpe=rpe,
        )

    def adapt(self) -> None:
        self.capacity *= 1 + self.drift_pct / 100


# --------------------------------------------------------------------------
# Simulation loop
# --------------------------------------------------------------------------

@dataclass
class Step:
    session_no: int
    plan: Prescription
    performed: SessionInput
    score: float
    decision: Decision
    confidence: int
    signal: float
    next_plan: Prescription


def run(
    athlete: Athlete,
    start: Prescription,
    sessions: int = 16,
    config: EngineConfig = DEFAULT_CONFIG,
) -> list[Step]:
    history: list[SessionInput] = []
    plan = start
    steps: list[Step] = []
    for i in range(1, sessions + 1):
        performed = athlete.perform(plan, i)
        history.append(performed)
        result = evaluate(history, plan, config)
        steps.append(
            Step(i, plan, performed, result.analysis.last_score, result.decision,
                 result.confidence, result.signal_strength, result.next)
        )
        if athlete.stall_after_session is not None and i >= athlete.stall_after_session:
            athlete.drift_pct = 0.0
        plan = result.next
        athlete.adapt()
    return steps


def print_table(name: str, steps: list[Step]) -> None:
    print(f"\n=== {name} ===")
    print(f"{'#':>2} {'plan':>16} {'done':>10} {'rpe':>3} {'score':>5} {'sig':>6} {'conf':>4}  decision   -> next")
    for s in steps:
        plan = f"{s.plan.weight:g}x{s.plan.reps}x{s.plan.sets}"
        done = f"{s.performed.actual_reps}x{s.performed.actual_sets}"
        nxt = f"{s.next_plan.weight:g}x{s.next_plan.reps}x{s.next_plan.sets}"
        print(f"{s.session_no:>2} {plan:>16} {done:>10} {s.performed.rpe:>3} {s.score:>5.1f} {s.signal:>6.2f} "
              f"{s.confidence:>4}  {s.decision.value:<9}  -> {nxt}")


# --------------------------------------------------------------------------
# Scenarios and acceptance criteria
# --------------------------------------------------------------------------

START = Prescription(60, 8, 3)


def _decisions(steps: list[Step]) -> list[Decision]:
    return [s.decision for s in steps]


def _max_weight_jump_pct(steps: list[Step]) -> float:
    return max(
        (s.next_plan.weight - s.plan.weight) / s.plan.weight * 100 for s in steps
    )


def scenario_steady_adapter(config=DEFAULT_CONFIG):
    """Novice gaining 1 %/session. Expect regular, controlled progression."""
    steps = run(Athlete(capacity=66, drift_pct=1.0), START, config=config)
    d = _decisions(steps)
    checks = {
        "PROGRESS in >= 4 of 16 sessions": d.count(Decision.PROGRESS) >= 4,
        "never BACK OFF": Decision.BACK_OFF not in d,
        "no single weight jump > 7.5 %": _max_weight_jump_pct(steps) <= 7.5 + 1e-9,
        "final weight > start": steps[-1].next_plan.weight > START.weight,
    }
    return steps, checks


def scenario_plateau(config=DEFAULT_CONFIG):
    """Capacity flat; athlete meets the plan at RPE 7-8. Expect mostly HOLD, no runaway."""
    steps = run(Athlete(capacity=63, drift_pct=0.0), START, config=config)
    d = _decisions(steps)
    windows = [d[i:i + 5].count(Decision.PROGRESS) for i in range(0, len(d) - 4)]
    checks = {
        "mostly HOLD (>= 10 of 16)": d.count(Decision.HOLD) >= 10,
        "<= 1 PROGRESS per any 5-session window": max(windows) <= 1,
        "never BACK OFF": Decision.BACK_OFF not in d,
    }
    return steps, checks


def scenario_progress_then_stall(config=DEFAULT_CONFIG):
    """Novice gains 1 %/session for 8 sessions, then stops adapting entirely.
    Expect progression early, then the engine settles into HOLD at a plan the
    athlete can actually complete - no runaway progression, no BACK OFF."""
    steps = run(Athlete(capacity=66, drift_pct=1.0, stall_after_session=8), START, config=config)
    d = _decisions(steps)
    late = d[10:]  # sessions 11-16: the stall has been felt for a while
    checks = {
        ">= 3 PROGRESS in sessions 1-8": d[:8].count(Decision.PROGRESS) >= 3,
        "<= 1 PROGRESS in sessions 11-16": late.count(Decision.PROGRESS) <= 1,
        "never BACK OFF": Decision.BACK_OFF not in d,
        "final plan is completable (all reps done at session 16)": steps[-1].performed.actual_reps == steps[-1].plan.reps,
    }
    return steps, checks


def scenario_fatigue(config=DEFAULT_CONFIG):
    """Capacity falls 0.8 %/session from a plan that is initially just right.
    The decline starts at the first *poor* session (missed reps or RPE >= 9)."""
    steps = run(Athlete(capacity=64, drift_pct=-0.8), START, config=config)
    d = _decisions(steps)
    first_backoff = next((s.session_no for s in steps if s.decision == Decision.BACK_OFF), None)
    first_poor = next((s.session_no for s in steps if s.score < config.poor_session_score), None)
    recovered = False
    if first_backoff is not None:
        following = [s for s in steps if s.session_no > first_backoff][:3]
        recovered = any(s.score >= config.neutral_score for s in following)
    max_drop = max((s.plan.weight - s.next_plan.weight) / s.plan.weight * 100 for s in steps)
    poor_before_backoff = sum(
        1 for s in steps if first_backoff is not None and s.session_no <= first_backoff and s.score < config.poor_session_score
    )
    checks = {
        "BACK OFF occurs": first_backoff is not None,
        "BACK OFF within 4 sessions of the first poor session": (
            first_backoff is not None and first_poor is not None and 0 <= first_backoff - first_poor <= 4
        ),
        "at least 2 poor sessions before the BACK OFF": poor_before_backoff >= 2,
        "a session after the back-off scores >= neutral": recovered,
        "no single weight drop > 12.5 %": max_drop <= 12.5 + 1e-9,
    }
    return steps, checks


def scenario_one_bad_day(config=DEFAULT_CONFIG):
    """Steady adapter with one rough day at session 8, compared with the same
    athlete without the bad day. One bad day must cost at most one
    progression and must never trigger a BACK OFF."""
    clean = run(Athlete(capacity=66, drift_pct=1.0), START, config=config)
    steps = run(Athlete(capacity=66, drift_pct=1.0, bad_days={8}), START, config=config)
    d = _decisions(steps)
    clean_d = _decisions(clean)
    checks = {
        "bad day itself -> HOLD (not BACK OFF, not PROGRESS)": steps[7].decision == Decision.HOLD,
        "never BACK OFF": Decision.BACK_OFF not in d,
        "at most one progression lost vs. the clean run": d.count(Decision.PROGRESS) >= clean_d.count(Decision.PROGRESS) - 1,
        "final weight within one step of the clean run": steps[-1].next_plan.weight >= clean[-1].next_plan.weight - config.weight_step,
    }
    return steps, checks


def scenario_noisy(config=DEFAULT_CONFIG):
    """Steady adapter with seeded +/-1 rep and +/-1 RPE noise."""
    clean = run(Athlete(capacity=66, drift_pct=1.0), START, config=config)
    steps = run(Athlete(capacity=66, drift_pct=1.0, noise_reps=1, noise_rpe=1, seed=7), START, config=config)
    d = _decisions(steps)
    clean_conf = sum(s.confidence for s in clean[4:]) / len(clean[4:])
    noisy_conf = sum(s.confidence for s in steps[4:]) / len(steps[4:])
    checks = {
        "never BACK OFF": Decision.BACK_OFF not in d,
        "average confidence below the clean adapter": noisy_conf < clean_conf,
        "still progresses at least twice": d.count(Decision.PROGRESS) >= 2,
    }
    return steps, checks


def scenario_light_load(config=DEFAULT_CONFIG):
    """Light dumbbell work (capacity 12 kg): progression should use reps, plates stay single steps."""
    start = Prescription(10, 10, 3)
    steps = run(Athlete(capacity=12, drift_pct=1.0), start, config=config)
    d = _decisions(steps)
    rep_increases = sum(1 for s in steps if s.next_plan.reps > s.plan.reps)
    weight_steps = [s.next_plan.weight - s.plan.weight for s in steps if s.next_plan.weight != s.plan.weight]
    checks = {
        "at least one rep-based progression": rep_increases >= 1,
        "weight changes are single plate steps": all(abs(w) <= config.weight_step + 1e-9 for w in weight_steps),
        "never BACK OFF": Decision.BACK_OFF not in d,
        "progresses at least 3 times": d.count(Decision.PROGRESS) >= 3,
    }
    return steps, checks


SCENARIOS = {
    "steady_adapter": scenario_steady_adapter,
    "plateau": scenario_plateau,
    "progress_then_stall": scenario_progress_then_stall,
    "fatigue": scenario_fatigue,
    "one_bad_day": scenario_one_bad_day,
    "noisy": scenario_noisy,
    "light_load": scenario_light_load,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("scenario", nargs="?", choices=sorted(SCENARIOS), help="run one scenario with a table")
    parser.add_argument("--all", action="store_true", help="run every scenario")
    parser.add_argument("--tables", action="store_true", help="with --all, also print the per-session tables")
    args = parser.parse_args(argv)

    names = sorted(SCENARIOS) if args.all or not args.scenario else [args.scenario]
    all_ok = True
    for name in names:
        steps, checks = SCENARIOS[name]()
        ok = all(checks.values())
        all_ok &= ok
        if args.scenario or args.tables:
            print_table(name, steps)
        print(f"[{'PASS' if ok else 'FAIL'}] {name}")
        for label, passed in checks.items():
            print(f"    {'ok ' if passed else 'XX '} {label}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
