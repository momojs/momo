import { describe, expect, test } from 'bun:test';

import { QueryClient } from '@tanstack/react-query';

import { stampRallyKeys, synchronizeStampRallyQueries } from './stamp-rally';

describe('stamp rally query consistency', () => {
  test('invalidates every domain cache without touching unrelated data', async () => {
    const queryClient = new QueryClient();
    const from = new Date(2026, 7, 1);
    const to = new Date(2026, 8, 1);
    const domainKeys = [
      stampRallyKeys.calendarPhotos(from, to),
      stampRallyKeys.daily(from),
      stampRallyKeys.dashboard(from),
      stampRallyKeys.recentCupTypes(),
    ];
    const unrelatedKey = ['preferences'] as const;

    for (const key of domainKeys) queryClient.setQueryData(key, ['cached']);
    queryClient.setQueryData(unrelatedKey, { theme: 'dark' });

    await synchronizeStampRallyQueries(queryClient);

    for (const key of domainKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  });
});
