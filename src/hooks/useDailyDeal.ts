import { useEffect } from 'react';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey } from '../lib/dates';

/**
 * Keeps today's set of words in step with the settings, on any screen that shows the daily goal:
 * deals the day's words, and tops them up as soon as words-per-day is raised (lowering never removes any).
 */
export function useDailyDeal() {
  const { state, dispatch } = useStore();
  const { data: pool, error } = useHsk();
  const today = dateKey();
  const { wordsPerDay } = state.settings;
  useEffect(() => {
    if (pool) dispatch({ type: 'ENSURE_DAY', today, pool });
  }, [pool, today, wordsPerDay, dispatch]);
  return { pool, error, today };
}
