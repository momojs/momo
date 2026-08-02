import { useRef } from 'react';

import {
  createFileRoute,
  Outlet,
  useMatch,
  useMatches,
  useRouter,
} from '@tanstack/react-router';

import {
  Calendar03Icon,
  DashboardSquare01Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons';
import type { ControlOption } from '@momots/design';
import { ToggleGroup } from '@momots/design';
import { AnimatePresence } from 'motion/react';

import { Icon } from '@/components/icon';
import type { PageDirection } from '@/components/page';
import { CalendarPageExtra } from '@/materials/calendar-page-extra';
import { DashboardPageExtra } from '@/materials/dashboard-page-extra';
import { m } from '@/paraglide/messages.js';
import type { FileRoutePath } from '@/stores/route';

export const Route = createFileRoute('/_tabbar')({
  component: RouteComponent,
});

const createTabbars = (): ControlOption<FileRoutePath, number>[] => [
  {
    meta: 0,
    value: '/calendar',
    label: m.app_nav_calendar(),
    icon: <Icon icon={Calendar03Icon} />,
    extra: <CalendarPageExtra />,
  },
  {
    meta: 1,
    value: '/dashboard',
    label: m.app_nav_dashboard(),
    icon: <Icon icon={DashboardSquare01Icon} />,
    extra: <DashboardPageExtra />,
  },
  {
    meta: 2,
    value: '/preferences',
    label: m.app_nav_settings(),
    icon: <Icon icon={Settings02Icon} />,
  },
];

function toTab(pathname?: string) {
  return createTabbars().find(
    ({ value }) => pathname === value || pathname?.startsWith(`${value}/`),
  );
}

function useNextMatch() {
  const matches = useMatches();

  const match = useMatch({ strict: false });

  return matches[matches.findIndex(({ id }) => id === match.id) + 1];
}

function useTabDirection(pathname?: string): PageDirection {
  const previousPathRef = useRef(pathname);
  const directionRef = useRef<PageDirection>(1);

  if (pathname && previousPathRef.current !== pathname) {
    const { meta: current = 0 } = toTab(pathname) ?? {};
    const { meta: previous = 0 } = toTab(previousPathRef.current) ?? {};

    directionRef.current = current >= previous ? 1 : -1;
    previousPathRef.current = pathname;
  }

  return directionRef.current;
}

function RouteComponent() {
  const router = useRouter();
  const tabbars = createTabbars();

  const { id, pathname } = useNextMatch() ?? {};
  const tabbar = tabbars.find(
    ({ value }) => pathname === value || pathname?.startsWith(`${value}/`),
  );

  const direction = useTabDirection(pathname);

  return (
    <div className='size-full grid grid-rows-[auto_1fr_auto]'>
      <header className='p-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between'>
        <h1 className='text-3xl font-momo-display font-bold'>
          {tabbar?.label}
        </h1>
        {tabbar?.extra}
      </header>
      <div className='relative min-h-0 overflow-hidden'>
        <AnimatePresence mode='wait' initial={false} custom={direction}>
          <Outlet key={id} />
        </AnimatePresence>
      </div>
      <nav className='w-full min-h-19 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]'>
        <ToggleGroup<FileRoutePath>
          size='lg'
          className='grid-cols-3'
          value={pathname as FileRoutePath}
          variant='tabbar'
          options={tabbars}
          onChange={(to) => {
            if (to) router.navigate({ to });
          }}
        />
      </nav>
    </div>
  );
}
