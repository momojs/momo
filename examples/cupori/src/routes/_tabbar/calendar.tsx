import { useCallback, useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { Button } from '@momots/design';
import { Drawer } from '@momots/design/components/drawer';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { Page } from '@/components/page';
import { getDateFnsLocale } from '@/helpers/locale';
import { ReadPhoto } from '@/helpers/photo';
import { Calendar } from '@/materials/calendar';
import { Daily } from '@/materials/daily';
import { StampForm } from '@/materials/stamp-form';
import { m } from '@/paraglide/messages.js';
import { stampRallyKeys } from '@/queries/stamp-rally';
import { ListStampRallyPhotos } from '@/services';
import { useCalendarPageStore } from '@/stores/page';

export const Route = createFileRoute('/_tabbar/calendar')({
  component: CalendarRoute,
});

const EMPTY_DAY_PHOTOS: ReadonlyMap<string, string> = new Map();

const toDayKey = (date: Date) => format(date, 'yyyy-MM-dd');

async function loadDayPhotos(from: Date, to: Date) {
  const records = await ListStampRallyPhotos(from, to);
  const latestPhotoByDay = new Map<string, string>();

  for (const record of records) {
    const key = toDayKey(record.consumedAt);
    if (record.photo && !latestPhotoByDay.has(key)) {
      latestPhotoByDay.set(key, record.photo);
    }
  }

  const photos = await Promise.all(
    [...latestPhotoByDay].map(async ([key, name]) => {
      try {
        return [key, await ReadPhoto(name)] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(
    photos.filter(
      (photo): photo is readonly [string, string] => photo !== null,
    ),
  );
}

function CalendarRoute() {
  const { date } = useCalendarPageStore();

  const [focusDate, setFocusDate] = useState(() => date);
  const [dailyOpen, setDailyOpen] = useState(false);

  useEffect(() => {
    setFocusDate(date);
  }, [date]);

  const range = useMemo(() => {
    const from = startOfWeek(startOfMonth(date));
    const to = startOfDay(addDays(endOfWeek(endOfMonth(date)), 1));
    return { from, to };
  }, [date]);

  const dayPhotosQuery = useQuery({
    queryKey: stampRallyKeys.calendarPhotos(range.from, range.to),
    queryFn: () => loadDayPhotos(range.from, range.to),
  });

  const dayPhotos = dayPhotosQuery.data ?? EMPTY_DAY_PHOTOS;

  const getDayImage = useCallback(
    (day: Date) => dayPhotos.get(toDayKey(day)),
    [dayPhotos],
  );

  return (
    <Page className='p-2 flex flex-col gap-4'>
      <Calendar
        month={date}
        locale={getDateFnsLocale()}
        selected={focusDate}
        getDayImage={getDayImage}
        onDayFocus={setFocusDate}
        onDayClick={(day) => {
          setFocusDate(day);
          setDailyOpen(true);
        }}
      />
      <Drawer
        direction='down'
        title={<span>{m.daily_add_cup()}</span>}
        snapPoints={[1]}
        trigger={
          <Button className='w-full' size='xl' variant='default'>
            {m.calendar_check_in()}
          </Button>
        }
      >
        <StampForm className='h-full' />
      </Drawer>
      <Drawer direction='down' open={dailyOpen} onOpenChange={setDailyOpen}>
        <Daily date={focusDate} />
      </Drawer>
    </Page>
  );
}
