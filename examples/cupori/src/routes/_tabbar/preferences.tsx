import { createFileRoute } from '@tanstack/react-router';

import {
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import type { ControlOption } from '@momots/design';
import { ToggleGroup } from '@momots/design';

import { Page } from '@/components/page';
import { m } from '@/paraglide/messages.js';
import type { Locale } from '@/paraglide/runtime.js';
import type { AppThemeMode } from '@/stores/app';
import { useAppStore } from '@/stores/app';
import { useLocaleStore } from '@/stores/locale';

export const Route = createFileRoute('/_tabbar/preferences')({
  component: PreferencesRoute,
});

function PreferencesRoute() {
  const { themeMode, setThemeMode } = useAppStore();
  const { locale, setLocale } = useLocaleStore();
  const themeOptions: ControlOption<AppThemeMode>[] = [
    {
      value: 'light',
      label: m.theme_light(),
      icon: <SunIcon />,
    },
    {
      value: 'dark',
      label: m.theme_dark(),
      icon: <MoonIcon />,
    },
    {
      value: 'system',
      label: m.theme_system(),
      icon: <ComputerDesktopIcon />,
    },
  ];
  const languageOptions: ControlOption<Locale>[] = [
    { value: 'zh-CN', label: m.language_zh_cn() },
    { value: 'en', label: m.language_en() },
  ];

  return (
    <Page className='px-3 pb-6 pt-1 text-momo-fg-default'>
      <div className='mx-auto grid w-full max-w-2xl gap-3'>
        <section className='rounded-momo-lg bg-momo-bg-surface-muted p-4'>
          <h2 className='text-sm font-semibold'>{m.settings_appearance()}</h2>
          <ToggleGroup
            className='mt-3 w-full [&>button]:flex-1'
            variant='segmented'
            value={themeMode}
            options={themeOptions}
            onChange={setThemeMode}
          />
        </section>

        <section className='rounded-momo-lg bg-momo-bg-surface-muted p-4'>
          <h2 className='text-sm font-semibold'>{m.settings_language()}</h2>
          <ToggleGroup<Locale>
            className='mt-3 w-full [&>button]:flex-1'
            variant='segmented'
            value={locale}
            options={languageOptions}
            onChange={(nextLocale) => {
              if (nextLocale) void setLocale(nextLocale);
            }}
          />
        </section>
      </div>
    </Page>
  );
}
