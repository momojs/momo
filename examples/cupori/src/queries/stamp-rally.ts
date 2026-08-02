import type { QueryClient } from '@tanstack/react-query';

export const stampRallyKeys = {
  all: ['stamp-rally'] as const,
  calendarPhotos: (from: Date, to: Date) =>
    [
      ...stampRallyKeys.all,
      'calendar-photos',
      from.getTime(),
      to.getTime(),
    ] as const,
  daily: (from: Date) =>
    [...stampRallyKeys.all, 'daily', from.getTime()] as const,
  dashboard: (from: Date) =>
    [...stampRallyKeys.all, 'dashboard', from.getTime()] as const,
  recentCupTypes: () => [...stampRallyKeys.all, 'recent-cup-types'] as const,
};

/**
 * 所有记录 mutation 的唯一缓存同步入口。
 *
 * TanStack Query 会立即重取当前屏幕的 active queries，并把未挂载的月份、
 * 日期和统计缓存标记为 stale；它们下次挂载时再按需读取 SQLite。
 */
export async function synchronizeStampRallyQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: stampRallyKeys.all,
    refetchType: 'active',
  });
}
