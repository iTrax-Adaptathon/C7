import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAdaptations,
  getExerciseLogs,
  getExerciseState,
  getExercises,
  getHealth,
  getStateSummary,
  submitWorkoutLog,
} from './fitness';

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('fitness api', () => {
  it('hits the documented paths without trailing slashes', async () => {
    const fetchMock = stubFetch([]);
    await getHealth();
    await getExercises();
    await getStateSummary();
    await getExerciseState(2);
    await getAdaptations(3);
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls).toEqual([
      'http://127.0.0.1:8000/health',
      'http://127.0.0.1:8000/exercises',
      'http://127.0.0.1:8000/state/summary',
      'http://127.0.0.1:8000/state/2',
      'http://127.0.0.1:8000/adaptations/3',
    ]);
  });

  it('passes limit to the logs endpoint', async () => {
    const fetchMock = stubFetch({ exerciseId: 1, exerciseName: 'x', logs: [] });
    await getExerciseLogs(1);
    await getExerciseLogs(1, 50);
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8000/logs/1?limit=20');
    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:8000/logs/1?limit=50');
  });

  it('POSTs the exact camelCase body and rounds rpe to an integer', async () => {
    const fetchMock = stubFetch({ decision: 'HOLD' }, 201);
    await submitWorkoutLog({
      exerciseId: 1,
      plannedWeight: 60,
      plannedReps: 8,
      plannedSets: 3,
      actualWeight: 62.5,
      actualReps: 8,
      actualSets: 3,
      rpe: 7.0,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8000/logs');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      exerciseId: 1,
      plannedWeight: 60,
      plannedReps: 8,
      plannedSets: 3,
      actualWeight: 62.5,
      actualReps: 8,
      actualSets: 3,
      rpe: 7,
    });
  });
});
